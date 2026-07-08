import { describe, expect, it } from "vitest";
import { PRODUCT_FIELD_LIMITS, clampText, parseFeaturesInput, splitProductNameLines } from "./productFieldLimits.js";

describe("productFieldLimits", () => {
  it("clamps text to max length", () => {
    expect(clampText("abcdef", 4)).toBe("abcd");
  });

  it("keeps product name on one line up to 14 characters", () => {
    expect(splitProductNameLines("Marfil Bianco")).toEqual(["Marfil Bianco"]);
  });

  it("wraps product name to two lines after 14 characters", () => {
    expect(splitProductNameLines("123456789012345678")).toEqual(["12345678901234", "5678"]);
  });

  it("stops product name at 28 characters", () => {
    const longName = "a".repeat(40);
    const lines = splitProductNameLines(longName);

    expect(lines.join("").length).toBe(PRODUCT_FIELD_LIMITS.productName);
    expect(lines).toEqual(["a".repeat(14), "a".repeat(14)]);
  });

  it("limits each parsed feature item", () => {
    const longFeature = "a".repeat(PRODUCT_FIELD_LIMITS.featureItem + 5);
    const features = parseFeaturesInput(`${longFeature}, Lucios`);

    expect(features[0]?.length).toBe(PRODUCT_FIELD_LIMITS.featureItem);
    expect(features[1]).toBe("Lucios");
  });
});
