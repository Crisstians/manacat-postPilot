import type { ProductCategory } from "./types.js";

/** Unități standard în retail materiale de construcții (RO). */
export const UNIT_BY_CATEGORY: Record<ProductCategory, string> = {
  gresie: "m²",
  faianta: "m²",
  vopsea: "L",
  parchet: "m²",
  adezivi: "kg",
  "produs-general": "buc",
};

export const unitForCategory = (category: ProductCategory): string =>
  UNIT_BY_CATEGORY[category];
