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

export const generateBulkCaption = (products: ProductInput[]): string => {
  if (products.length === 0) {
    return "";
  }
  if (products.length === 1) {
    return generateCaption(products[0]!);
  }

  const lines = products.map((product, index) => {
    const priceText = `${product.price.toFixed(2)} lei/${product.unit}`;
    return `${index + 1}. ${product.productName} - ${product.category.toUpperCase()} (${priceText})`;
  });

  const categories = [...new Set(products.map((product) => product.category))];
  const tags = categories
    .map((category) => categoryTags[category] ?? "#MaterialeConstructii")
    .join(" ");

  return [
    `Oferta Manacat - ${products.length} produse`,
    "",
    ...lines,
    "",
    "Scrie-ne pentru oferta si stoc actualizat!",
    `#Manacat #AmenajariInterioare ${tags}`,
  ].join("\n");
};
