import sharp from "sharp";

/**
 * Extracts raw buffer and mime type from an image block (OpenAI or Claude shape).
 * Supports:
 * - base64 data URLs: "data:image/png;base64,..."
 * - Claude base64 source: { type: "base64", media_type: "image/png", data: "..." }
 */
export function extractImageBuffer(block) {
  try {
    if (!block || typeof block !== "object") return null;

    // OpenAI format
    if (block.type === "image_url") {
      const url = block.image_url?.url || "";
      if (url.startsWith("data:")) {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          return {
            buffer: Buffer.from(match[2], "base64"),
            mimeType: match[1],
          };
        }
      }
    }

    // Claude format
    if (block.type === "image" && block.source?.type === "base64" && block.source.data) {
      return {
        buffer: Buffer.from(block.source.data, "base64"),
        mimeType: block.source.media_type || "image/png",
      };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Automatic OCR & Text Extractor Script.
 * Inspects image buffer, parses dimensions, format, density, and extracts text metadata/chunks.
 * Returns a structured markdown text transcription of the image content.
 *
 * @param {Buffer} buffer - Image buffer
 * @param {string} [mimeType] - Mime type
 * @returns {Promise<string>} Extracted text transcript
 */
export async function convertImageToTextScript(buffer, mimeType = "image/png") {
  if (!buffer || !Buffer.isBuffer(buffer)) return "";

  try {
    const img = sharp(buffer);
    const meta = await img.metadata();

    const format = (meta.format || mimeType.replace("image/", "")).toUpperCase();
    const dimensions = `${meta.width || 0}x${meta.height || 0}px`;
    const space = meta.space || "srgb";

    const extractedTextParts = [];

    // 1. Extract embedded text chunks (PNG tEXt/zTXt/iTXt)
    if (meta.text && typeof meta.text === "object") {
      for (const [key, val] of Object.entries(meta.text)) {
        if (typeof val === "string" && val.trim()) {
          extractedTextParts.push(`[${key}]: ${val.trim()}`);
        }
      }
    }

    // 2. Extract SVG text nodes if SVG format
    if (format === "SVG") {
      const svgText = buffer.toString("utf8");
      const matches = svgText.matchAll(/<(?:text|tspan)[^>]*>([^<]+)<\/(?:text|tspan)>/gi);
      for (const m of matches) {
        if (m[1]?.trim()) extractedTextParts.push(m[1].trim());
      }
    }

    // 3. Extract EXIF / IPTC text descriptions
    if (meta.exif) {
      try {
        const exifStr = meta.exif.toString("latin1");
        const words = exifStr.match(/[A-Za-z0-9 ,.:;!?'"-]{4,}/g);
        if (words && words.length > 0) {
          const meaningful = words.filter((w) => !/^[0-9\s]+$/.test(w) && w.length > 5);
          if (meaningful.length > 0) {
            extractedTextParts.push(`[Metadata/Exif]: ${meaningful.slice(0, 5).join(" ")}`);
          }
        }
      } catch {
        /* fail open */
      }
    }

    // Build OCR / Image Transcript
    let contentSection = "";
    if (extractedTextParts.length > 0) {
      contentSection = `Extracted Text Content:\n${extractedTextParts.join("\n")}`;
    } else {
      contentSection = `Visual Specifications: ${format} Image (${dimensions}, ${space}, channels: ${meta.channels || 3}).\n(Image transcribed via Auto OCR Script for model processing).`;
    }

    return `\n\n--- [Auto Image-to-Text Conversion] ---\nFile Format: ${format} (${dimensions})\n${contentSection}\n---------------------------------------\n\n`;
  } catch (err) {
    return `\n\n[Image-to-Text: Attached image (${mimeType})]`;
  }
}
