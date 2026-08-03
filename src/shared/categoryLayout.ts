import type { ProductCategory } from "./types.js";

/** Gresie și faianță: dimensiune pe graphic + placă-referință pentru poză. */
const TILE_CATEGORIES: ReadonlySet<ProductCategory> = new Set(["gresie", "faianta"]);

export const categoryUsesSize = (category: ProductCategory): boolean =>
  TILE_CATEGORIES.has(category);

/** Dreptunghiul de referință (placa) unde se încarcă imaginea produsului. */
export const categoryShowsProductPlate = (category: ProductCategory): boolean =>
  TILE_CATEGORIES.has(category);
