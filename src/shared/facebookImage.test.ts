import { describe, expect, it } from "vitest";
import { facebookTargetSize } from "./facebookImage";

describe("facebookTargetSize", () => {
  it("scales template 2938×2463 to longest edge 2048", () => {
    const target = facebookTargetSize(2938, 2463);
    expect(target.width).toBe(2048);
    expect(target.height).toBe(Math.round((2463 * 2048) / 2938));
    expect(Math.max(target.width, target.height)).toBe(2048);
  });
});
