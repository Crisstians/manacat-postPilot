import { PRODUCT_FIELD_LIMITS, clampText } from "./productFieldLimits.js";

export const DIMENSION_ICON_NATIVE_SIZE = { width: 64, height: 64 };
export const MATERIAL_ICON_NATIVE_SIZE = { width: 92, height: 61 };

export interface ParsedSizeLabel {
  width: string;
  height: string;
  unit: string;
}

export const clampDimensionValue = (value: string | undefined): string =>
  clampText((value ?? "").replace(/\D/g, ""), PRODUCT_FIELD_LIMITS.sizeDimension);

export const buildParsedSize = (
  width: string | undefined,
  height: string | undefined,
): ParsedSizeLabel | null => {
  const normalizedWidth = clampDimensionValue(width);
  const normalizedHeight = clampDimensionValue(height);

  if (!normalizedWidth || !normalizedHeight) {
    return null;
  }

  return {
    width: normalizedWidth,
    height: normalizedHeight,
    unit: "cm",
  };
};

export const buildSizeLabel = (width: string | undefined, height: string | undefined): string => {
  const parsed = buildParsedSize(width, height);
  return parsed ? `${parsed.width}x${parsed.height}${parsed.unit}` : "";
};

export const parseSizeLabel = (raw: string): ParsedSizeLabel | null => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-") {
    return null;
  }

  const match = trimmed.match(/^(\d+)\s*[xX×]\s*(\d+)\s*([a-zA-Z]{1,4})?$/);
  if (!match) {
    return null;
  }

  return {
    width: match[1],
    height: match[2],
    unit: (match[3] ?? "cm").toLowerCase(),
  };
};

export const formatSizeLabel = (parsed: ParsedSizeLabel): string =>
  `${parsed.width} x ${parsed.height} ${parsed.unit}`;
