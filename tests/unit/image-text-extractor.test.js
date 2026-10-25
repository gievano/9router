import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  extractImageBuffer,
  convertImageToTextScript,
} from "../../src/lib/plugins/imageTextExtractor.js";
import { applyImageVision } from "../../src/lib/plugins/customPluginsRuntime.js";

describe("Image-to-Text OCR Extractor Script", () => {
  it("extracts buffer from base64 data URL", () => {
    const rawData = Buffer.from("hello world").toString("base64");
    const block = {
      type: "image_url",
      image_url: { url: `data:image/png;base64,${rawData}` },
    };

    const res = extractImageBuffer(block);
    expect(res).not.toBeNull();
    expect(res.mimeType).toBe("image/png");
    expect(res.buffer.toString("utf8")).toBe("hello world");
  });

  it("extracts buffer from Claude image format", () => {
    const rawData = Buffer.from("claude image data").toString("base64");
    const block = {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: rawData,
      },
    };

    const res = extractImageBuffer(block);
    expect(res).not.toBeNull();
    expect(res.mimeType).toBe("image/jpeg");
    expect(res.buffer.toString("utf8")).toBe("claude image data");
  });

  it("converts image buffer into structured OCR text transcript", async () => {
    // Generate a minimal valid 10x10 PNG buffer using sharp
    const pngBuffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const transcript = await convertImageToTextScript(pngBuffer, "image/png");
    expect(transcript).toContain("Auto Image-to-Text Conversion");
    expect(transcript).toContain("PNG (10x10px");
  });

  it("converts image blocks to text blocks for non-vision models", async () => {
    const pngBuffer = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const base64Data = pngBuffer.toString("base64");
    const body = {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is this?" },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64Data}` },
            },
          ],
        },
      ],
    };

    // Text-only model (caps.vision is false)
    await applyImageVision(body, { vision: false });

    const userContent = body.messages[0].content;
    expect(userContent).toHaveLength(2);
    expect(userContent[1].type).toBe("text");
    expect(userContent[1].text).toContain("Auto Image-to-Text Conversion");
    expect(body.messages[0].content.some((b) => b.type === "image_url")).toBe(false);
  });
});
