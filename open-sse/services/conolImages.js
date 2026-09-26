/**
 * Image resolution + security for Conol vision input.
 * Ported from OmniRoute open-sse/utils/cursorImages.ts.
 *
 * Turns OpenAI `image_url` parts (base64 `data:` URIs or remote `http(s)`
 * URLs) into decoded bytes ready to upload to Conol's asset endpoint.
 *
 * Security rules (kept from OmniRoute, adapted to ExtremeRouter's guard):
 *  - SSRF: remote fetches go through the project's outbound guard
 *    (`assertPublicUrl` from src/shared/utils/ssrfGuard.js), which rejects
 *    non-http(s) schemes, embedded credentials, localhost, link-local, and
 *    private/CGNAT ranges. Redirects are followed MANUALLY so every hop is
 *    re-validated before the next fetch (a public host can't 30x-redirect into
 *    a private address). Client-supplied image URLs are always held to the
 *    strict public-only policy.
 *    Note: like the shared guard itself, the hostname is validated as a
 *    literal string — DNS-rebind (public name resolving to a private IP) is
 *    out of scope here, matching the project's current guard level.
 *  - Size cap: each image must decode to <= 1 MiB, enforced both before
 *    base64 decode (cheap pre-check) and while streaming a remote body.
 *  - Content type: data URIs and URL responses must be `image/*`.
 *  - Errors throw `ConolImageError` with a clean, path-free message; the
 *    executor maps it to a sanitized 400 response.
 */
import { assertPublicUrl } from "@/shared/utils/ssrfGuard.js";

// 1 MiB per image — matches composer-api's MAX_CURSOR_IMAGE_BYTES.
export const MAX_CONOL_IMAGE_BYTES = 1024 * 1024;

// Upper bound on the number of images per request (each triggers one upload).
export const MAX_CONOL_IMAGES = 12;

// Wall-clock cap for a single remote image fetch.
const IMAGE_FETCH_TIMEOUT_MS = 15000;

// Bound on how many redirects fetchImageBytes will follow (each re-validated
// against the SSRF guard before the next hop).
const MAX_IMAGE_REDIRECTS = 3;

/** A 400-class error carrying a clean, non-sensitive message. */
export class ConolImageError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ConolImageError";
    this.status = status;
  }
}

function decodeDataUrl(url) {
  // data:[<mediatype>][;base64],<data>
  const comma = url.indexOf(",");
  if (comma < 0) {
    throw new ConolImageError("Image data URL is malformed.");
  }
  const header = url.slice(5, comma); // strip leading "data:"
  const payload = url.slice(comma + 1);
  const isBase64 = /;base64/i.test(header);
  const mimeType = (header.split(";")[0] || "").trim().toLowerCase() || "application/octet-stream";

  if (!mimeType.startsWith("image/")) {
    throw new ConolImageError("Image data URL must have an image/* media type.");
  }
  if (!isBase64) {
    throw new ConolImageError("Image data URL must be base64-encoded.");
  }

  // Reject on the raw payload length BEFORE the whitespace strip, so an
  // arbitrarily large data URL can't burn CPU. Base64 expands ~4:3, so 2x the
  // byte cap is a safe upper bound on the encoded text.
  if (payload.length > MAX_CONOL_IMAGE_BYTES * 2) {
    throw new ConolImageError("Image input is too large (max 1 MiB). Resize and retry.");
  }

  const normalized = payload.replace(/\s/g, "");
  // Cheap pre-check: 4 base64 chars -> 3 bytes.
  if (Math.floor((normalized.length * 3) / 4) > MAX_CONOL_IMAGE_BYTES) {
    throw new ConolImageError("Image input is too large (max 1 MiB). Resize and retry.");
  }

  let data;
  try {
    data = Buffer.from(normalized, "base64");
  } catch {
    throw new ConolImageError("Image data URL contains invalid base64 data.");
  }
  // Buffer.from(base64) silently drops invalid trailing chars; guard against a
  // payload that decoded to nothing despite being non-empty.
  if (normalized.length > 0 && data.length === 0) {
    throw new ConolImageError("Image data URL contains invalid base64 data.");
  }
  return { data, mimeType };
}

// Validate a URL through the SSRF guard, mapping guard errors to clean,
// non-sensitive ConolImageErrors (no URL echoed back).
function validatePublicImageUrl(url) {
  try {
    assertPublicUrl(url);
    return new URL(url);
  } catch {
    throw new ConolImageError("Image URL is invalid or points to a blocked address.");
  }
}

async function fetchImageBytes(url) {
  // Follow redirects MANUALLY and re-validate every hop through the SSRF guard.
  let currentUrl = url;
  for (let hop = 0; hop <= MAX_IMAGE_REDIRECTS; hop++) {
    const parsed = validatePublicImageUrl(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(parsed.toString(), {
        method: "GET",
        signal: controller.signal,
        redirect: "manual",
      });
    } catch {
      clearTimeout(timer);
      throw new ConolImageError("Could not fetch the image URL.");
    }
    try {
      // Manual redirect: resolve Location against the current URL and loop so
      // the next hop is re-validated by the SSRF guard.
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new ConolImageError("Image URL redirect is missing a destination.");
        }
        try {
          currentUrl = new URL(location, parsed.toString()).toString();
        } catch {
          throw new ConolImageError("Image URL redirect destination is invalid.");
        }
        continue;
      }

      if (!response.ok) {
        throw new ConolImageError(`Could not fetch the image URL (status ${response.status}).`);
      }
      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      const mimeType = contentType.split(";")[0].trim();
      if (!mimeType.startsWith("image/")) {
        throw new ConolImageError("Image URL did not return an image content type.");
      }
      // Reject early on an oversized Content-Length, then still cap during read.
      const declaredLen = Number(response.headers.get("content-length") || "0");
      if (Number.isFinite(declaredLen) && declaredLen > MAX_CONOL_IMAGE_BYTES) {
        throw new ConolImageError("Image input is too large (max 1 MiB). Resize and retry.");
      }
      const data = await readCapped(response, MAX_CONOL_IMAGE_BYTES);
      return { data, mimeType };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ConolImageError("Image URL has too many redirects.");
}

/**
 * Read a fetch Response body into a Buffer, aborting as soon as the
 * accumulated size exceeds `cap`. Consumes the body incrementally so an
 * oversized body is rejected mid-read rather than fully buffered.
 */
async function readCapped(response, cap) {
  const body = response.body;
  if (!body) {
    return Buffer.alloc(0);
  }

  const chunks = [];
  let total = 0;
  const pushCapped = (chunk) => {
    total += chunk.byteLength;
    if (total > cap) {
      throw new ConolImageError("Image input is too large (max 1 MiB). Resize and retry.");
    }
    chunks.push(Buffer.from(chunk));
  };

  if (typeof body[Symbol.asyncIterator] === "function") {
    for await (const chunk of body) {
      pushCapped(chunk);
    }
    return Buffer.concat(chunks, total);
  }

  if (typeof body.getReader === "function") {
    const reader = body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) pushCapped(value);
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* already closed */
      }
    }
    return Buffer.concat(chunks, total);
  }

  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.length > cap) {
    throw new ConolImageError("Image input is too large (max 1 MiB). Resize and retry.");
  }
  return buf;
}

/**
 * Resolve OpenAI `image_url` URLs (data: or http(s):) into
 * `{ data, mimeType }[]` ready to upload to Conol. Throws ConolImageError
 * (clean message, sanitizable) on any invalid / oversized / blocked input.
 */
export async function resolveConolImages(imageUrls) {
  if (imageUrls.length > MAX_CONOL_IMAGES) {
    throw new ConolImageError(`Too many images in one request (max ${MAX_CONOL_IMAGES}).`);
  }
  const out = [];
  for (const url of imageUrls) {
    if (typeof url !== "string" || !url) {
      throw new ConolImageError("Image URL is missing.");
    }
    // The data: scheme is case-insensitive (RFC 2397); match it that way but
    // pass the original (un-lowercased) url so the base64 payload is preserved.
    const { data, mimeType } = url.toLowerCase().startsWith("data:")
      ? decodeDataUrl(url)
      : await fetchImageBytes(url);
    if (!data.length) {
      throw new ConolImageError("Image input is empty.");
    }
    if (data.length > MAX_CONOL_IMAGE_BYTES) {
      throw new ConolImageError("Image input is too large (max 1 MiB). Resize and retry.");
    }
    out.push({ data, mimeType });
  }
  return out;
}

/**
 * Extract image_url URLs from an OpenAI-shaped message content array.
 * Returns the raw url strings (data: or http(s):) in order. Non-image parts
 * are ignored. A plain string content has no images.
 */
export function extractImageUrls(content) {
  if (!Array.isArray(content)) return [];
  const urls = [];
  for (const part of content) {
    if (part && typeof part === "object" && part.type === "image_url") {
      const imageUrl = part.image_url;
      if (typeof imageUrl === "string") {
        urls.push(imageUrl);
      } else if (
        imageUrl &&
        typeof imageUrl === "object" &&
        typeof imageUrl.url === "string"
      ) {
        urls.push(imageUrl.url);
      }
    }
  }
  return urls;
}
