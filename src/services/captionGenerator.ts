import type { ProductInput } from "../shared/types.js";

const categoryTags: Record<string, string> = {
  gresie: "#Gresie",
  faianta: "#Faianta",
  vopsea: "#Vopsea",
  parchet: "#Parchet",
  adezivi: "#Adezivi",
};

export const generateCaption = (product: ProductInput): string => {
  const primaryFeature = product.features[0] ?? "Calitate premium";
  const secondaryFeature = product.features[1] ?? "Rezistenta in timp";
  const priceText = `${product.price.toFixed(2)} lei/${product.unit}`;
  const categoryTag = categoryTags[product.category] ?? "#MaterialeConstructii";

  return [
    `${product.productName} - ${product.category.toUpperCase()}`,
    `Pret: ${priceText}`,
    `Caracteristici: ${primaryFeature}, ${secondaryFeature}`,
    "Scrie-ne pentru oferta si stoc actualizat!",
    "#Manacat #AmenajariInterioare " + categoryTag,
  ].join("\n");
};
