import { describe, expect, it } from "vitest";
import { computeContainRect, computeCoverRectBottomRight, resolveProductImageRect } from "./layout";

describe("computeContainRect", () => {
  it("keeps full width for wider image", () => {
    const result = computeContainRect({
      sourceWidth: 1200,
      sourceHeight: 600,
      target: { x: 100, y: 200, width: 300, height: 300 },
    });

    expect(result.width).toBe(300);
    expect(result.height).toBe(150);
    expect(result.y).toBe(275);
  });

  it("keeps full height for taller image", () => {
    const result = computeContainRect({
      sourceWidth: 600,
      sourceHeight: 1200,
      target: { x: 100, y: 200, width: 300, height: 300 },
    });

    expect(result.height).toBe(300);
    expect(result.width).toBe(150);
    expect(result.x).toBe(175);
  });
});

describe("resolveProductImageRect", () => {
  it("uses manual layout override when provided", () => {
    const override = { x: 500, y: 80, width: 320, height: 420 };
    const result = resolveProductImageRect(1200, 1800, { x: 100, y: 200, width: 300, height: 300 }, override);

    expect(result).toEqual(override);
  });
});

describe("computeCoverRectBottomRight", () => {
  it("anchors bottom-right for wider images", () => {
    const result = computeCoverRectBottomRight({
      sourceWidth: 1200,
      sourceHeight: 600,
      target: { x: 0, y: 0, width: 2938, height: 2463 },
    });

    // For wider images: height matches target, width becomes larger and is cropped from the left.
    expect(result.height).toBe(2463);
    expect(result.width).toBeCloseTo(4926, 0);
    expect(result.x).toBeCloseTo(-1988, 0);
    expect(result.y).toBe(0);
  });
});
