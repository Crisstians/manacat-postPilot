import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { FACEBOOK_MAX_LONG_EDGE, FACEBOOK_PNG_MAX_BYTES, facebookTargetSize } from "../shared/facebookImage";
import { prepareForFacebook } from "./prepareForFacebook";

describe("facebookTargetSize", () => {
  it("keeps images already at or under 2048", () => {
    expect(facebookTargetSize(2048, 1717)).toEqual({ width: 2048, height: 1717, scale: 1 });
    expect(facebookTargetSize(1200, 900).scale).toBe(1);
  });

  it("scales Manacat template so longest edge is 2048", () => {
    const target = facebookTargetSize(2938, 2463);
    expect(target.width).toBe(2048);
    expect(target.height).toBe(Math.round(2463 * (2048 / 2938)));
    expect(Math.max(target.width, target.height)).toBe(2048);
  });
});

describe("prepareForFacebook", () => {
  it("downscales oversized images to max long edge 2048", async () => {
    const input = await sharp({
      create: {
        width: 2938,
        height: 2463,
        channels: 3,
        background: { r: 200, g: 40, b: 40 },
      },
    })
      .png()
      .toBuffer();

    const prepared = await prepareForFacebook(input);
    expect(Math.max(prepared.width, prepared.height)).toBe(FACEBOOK_MAX_LONG_EDGE);
    expect(prepared.buffer.length).toBeGreaterThan(100);
    expect(["image/png", "image/jpeg"]).toContain(prepared.mimeType);
  });

  it("prefers PNG when the result fits under Meta's ~1MB guidance", async () => {
    const input = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 30, g: 30, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const prepared = await prepareForFacebook(input);
    expect(prepared.mimeType).toBe("image/png");
    expect(prepared.buffer.length).toBeLessThanOrEqual(FACEBOOK_PNG_MAX_BYTES);
    expect(prepared.width).toBe(800);
    expect(prepared.height).toBe(600);
  });
});
