/** Limite de caractere pentru câmpurile produsului, aliniate cu zonele din template. */
export const PRODUCT_FIELD_LIMITS = {
  productName: 28,
  productNameLineLength: 14,
  description: 140,
  featuresRaw: 80,
  featureItem: 28,
  sizeDimension: 4,
  priceMax: 999_999.99,
} as const;

export const clampText = (value: string, maxLength: number): string =>
  value.length <= maxLength ? value : value.slice(0, maxLength);

/** Împarte numele produsului pe max. 2 linii câte 14 caractere. */
export const splitProductNameLines = (value: string): string[] => {
  const text = clampText(value, PRODUCT_FIELD_LIMITS.productName);
  const lineLength = PRODUCT_FIELD_LIMITS.productNameLineLength;

  if (text.length <= lineLength) {
    return [text];
  }

  return [text.slice(0, lineLength), text.slice(lineLength)];
};

export const parseFeaturesInput = (raw: string): string[] =>
  raw
    .split(",")
    .map((item) => clampText(item.trim(), PRODUCT_FIELD_LIMITS.featureItem))
    .filter(Boolean);
