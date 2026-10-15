import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { downscalePhoto } from "@/lib/images/resize";

describe("downscalePhoto", () => {
  it("downscales a large image to WebP within 1024px and shrinks the bytes", async () => {
    const input = await sharp({
      create: {
        width: 4000,
        height: 3000,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const { data, contentType, ext } = await downscalePhoto(input);
    const meta = await sharp(data).metadata();

    expect(contentType).toBe("image/webp");
    expect(ext).toBe("webp");
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(
      1024,
    );
    expect(data.length).toBeLessThan(input.length);
  });

  it("does not upscale a tiny image (dimensions preserved)", async () => {
    const input = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const { data } = await downscalePhoto(input);
    const meta = await sharp(data).metadata();

    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });
});
