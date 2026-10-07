import { describe, it, expect } from "vitest";
import { publicPhotoUrl, isExternalPhotoUrl } from "@/lib/photos";

describe("isExternalPhotoUrl", () => {
  it("is true for absolute http(s) URLs (case-insensitive)", () => {
    expect(isExternalPhotoUrl("http://example.com/p.jpg")).toBe(true);
    expect(isExternalPhotoUrl("https://example.com/p.jpg")).toBe(true);
    expect(isExternalPhotoUrl("HTTPS://EXAMPLE.COM/P.JPG")).toBe(true);
  });

  it("is false for bucket object names and empty/nullish values", () => {
    expect(isExternalPhotoUrl("3f2c-abc.jpg")).toBe(false);
    expect(isExternalPhotoUrl("ftp://example.com/p.jpg")).toBe(false);
    expect(isExternalPhotoUrl("")).toBe(false);
    expect(isExternalPhotoUrl(null)).toBe(false);
    expect(isExternalPhotoUrl(undefined)).toBe(false);
  });
});

describe("publicPhotoUrl", () => {
  it("assembles the public bucket URL for a stored object name", () => {
    // NEXT_PUBLIC_SUPABASE_URL is forced to the test stack in vitest.config.ts.
    expect(publicPhotoUrl("abc.jpg")).toBe(
      "http://127.0.0.1:55321/storage/v1/object/public/player-photos/abc.jpg",
    );
  });

  it("returns an external image URL unchanged (pass-through, no assembly)", () => {
    const url = "https://cdn.example.com/photos/123.webp";
    expect(publicPhotoUrl(url)).toBe(url);
  });
});
