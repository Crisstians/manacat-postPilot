import type { CatalogProduct } from "../services/productsApi.js";
import { isValidFeatureForCategory } from "./categoryFeatures.js";
import { categoryUsesSize } from "./categoryLayout.js";
import { unitForCategory } from "./categoryUnits.js";
import { PRODUCT_FIELD_LIMITS, clampText } from "./productFieldLimits.js";
import { defaultSubtitleForCategory } from "./productSubtitle.js";
import type { ProductCategory, ProductInput } from "./types.js";

const nonEmpty = (value: string | undefined | null): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeCategoryHint = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

/**
 * Maps ERP catalog category text to a PostPilot category.
 * Falls back to produs-general when the match is unclear.
 */
export const mapCatalogCategory = (categoryHint: string): ProductCategory => {
  const hint = normalizeCategoryHint(categoryHint);
  if (!hint) return "produs-general";

  if (hint.includes("gresie")) return "gresie";
  if (hint.includes("faianta") || hint.includes("faienta")) return "faianta";
  if (hint.includes("vopsea")) return "vopsea";
  if (hint.includes("parchet") || hint.includes("laminat")) return "parchet";
  if (hint.includes("adeziv")) return "adezivi";

  return "produs-general";
};

/** Display / autofill name: prefer editorial nameAlt, fall back to ERP name. */
export const catalogDisplayName = (catalog: CatalogProduct): string =>
  nonEmpty(catalog.nameAlt) || nonEmpty(catalog.name);

/** Prefer shortDescription, fall back to description. */
export const catalogDescription = (catalog: CatalogProduct): string =>
  nonEmpty(catalog.shortDescription) || nonEmpty(catalog.description);

export const catalogPrimaryImage = (catalog: CatalogProduct): string => {
  const primary = nonEmpty(catalog.image);
  if (primary) return primary;
  const first = catalog.images?.find((url) => nonEmpty(url));
  return first ? first.trim() : "";
};

/**
 * Applies catalog fields onto the current product form.
 * Overwrites name/price/description/image when catalog values are non-empty;
 * always sets category (produs-general if ERP category is unclear).
 */
export const mapCatalogProductToInput = (
  catalog: CatalogProduct,
  current: ProductInput,
): ProductInput => {
  const category = mapCatalogCategory(catalog.category);
  const currentFeature = current.features[0] ?? "";
  const keepFeature =
    Boolean(currentFeature) && isValidFeatureForCategory(category, currentFeature);
  const keepSize = categoryUsesSize(category);

  const next: ProductInput = {
    ...current,
    category,
    unit: unitForCategory(category),
    subtitle:
      category === current.category
        ? current.subtitle
        : defaultSubtitleForCategory(category),
    features: keepFeature ? [currentFeature] : [],
    sizeWidth: keepSize ? current.sizeWidth : "",
    sizeHeight: keepSize ? current.sizeHeight : "",
  };

  const name = catalogDisplayName(catalog);
  if (name) {
    next.productName = clampText(name, PRODUCT_FIELD_LIMITS.productName);
  }

  if (typeof catalog.price === "number" && Number.isFinite(catalog.price) && catalog.price > 0) {
    next.price = Math.min(catalog.price, PRODUCT_FIELD_LIMITS.priceMax);
  }

  const description = catalogDescription(catalog);
  if (description) {
    next.description = clampText(description, PRODUCT_FIELD_LIMITS.description);
  }

  const image = catalogPrimaryImage(catalog);
  if (image) {
    next.productImagePath = image;
  }

  return next;
};
