import type { ProductCategory, ProductInput } from "./types";

const defaultSubtitles: Record<ProductCategory, string> = {
  gresie: "Placă ceramică\nPremium",
  faianta: "Faianță\nPremium",
  vopsea: "Vopsea\nPremium",
  parchet: "Parchet\nPremium",
  adezivi: "Adeziv\nPremium",
  "produs-general": "Produs\nGeneral",
};

export const defaultSubtitleForCategory = (category: ProductCategory): string =>
  defaultSubtitles[category];

export const getProductSubtitleLines = (product: ProductInput): string[] => {
  const text = product.subtitle.trim() || defaultSubtitleForCategory(product.category);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? lines : [defaultSubtitleForCategory(product.category).split("\n")[0]!];
};
