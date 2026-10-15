import sharp from "sharp";

// Downscale an uploaded player photo to a web-friendly WebP: EXIF-oriented,
// capped at 1024px on its longest edge (never upscaled), re-encoded at quality
// 80. Returns the WebP bytes plus the content type + extension to store under,
// so both upload paths (web action + MCP tool) stay byte-for-byte consistent.
// `.rotate()` with no args auto-orients from the EXIF orientation tag.
export async function downscalePhoto(
  input: Buffer | ArrayBuffer,
): Promise<{ data: Buffer; contentType: "image/webp"; ext: "webp" }> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const data = await sharp(buffer)
    .rotate()
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
  return { data, contentType: "image/webp", ext: "webp" };
}
