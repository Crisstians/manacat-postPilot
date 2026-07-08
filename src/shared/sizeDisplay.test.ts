import { describe, expect, it } from "vitest";
import { buildParsedSize, buildSizeLabel, clampDimensionValue, formatSizeLabel, parseSizeLabel } from "./sizeDisplay.js";

describe("sizeDisplay", () => {
  it("builds size label from two fields", () => {
    expect(buildSizeLabel("60", "120")).toBe("60x120cm");
    expect(buildParsedSize("60", "120")).toEqual({ width: "60", height: "120", unit: "cm" });
  });

  it("handles empty or undefined dimension fields", () => {
    expect(buildParsedSize("", "")).toBeNull();
    expect(buildParsedSize(undefined, undefined)).toBeNull();
    expect(clampDimensionValue(undefined)).toBe("");
  });

  it("returns empty label when a dimension is missing", () => {
    expect(buildSizeLabel("60", "")).toBe("");
    expect(buildParsedSize("60", "")).toBeNull();
  });

  it("parses compact size labels", () => {
    expect(parseSizeLabel("60x120cm")).toEqual({ width: "60", height: "120", unit: "cm" });
  });

  it("parses spaced size labels", () => {
    expect(parseSizeLabel("60 x 120 cm")).toEqual({ width: "60", height: "120", unit: "cm" });
  });

  it("defaults unit to cm when missing", () => {
    expect(parseSizeLabel("50x80")).toEqual({ width: "50", height: "80", unit: "cm" });
  });

  it("returns null for invalid labels", () => {
    expect(parseSizeLabel("-")).toBeNull();
    expect(parseSizeLabel("dimensiune variabila")).toBeNull();
  });

  it("formats parsed size labels for display", () => {
    expect(formatSizeLabel({ width: "60", height: "120", unit: "cm" })).toBe("60 x 120 cm");
  });
});
