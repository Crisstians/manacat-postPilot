import { describe, expect, it } from "vitest";
import { isSquareMeterUnit, unitPriceSuffixText } from "./unitDisplay.js";

describe("unitDisplay", () => {
  it("uses lei + icon suffix for square meter", () => {
    expect(isSquareMeterUnit("m²")).toBe(true);
    expect(unitPriceSuffixText("m²")).toBe("lei");
  });

  it("uses lei/unit text for other units", () => {
    expect(unitPriceSuffixText("L")).toBe("lei/L");
    expect(unitPriceSuffixText("kg")).toBe("lei/kg");
    expect(unitPriceSuffixText("buc")).toBe("lei/buc");
  });
});
