import { unitForCategory } from "./categoryUnits.js";
import type { ProductInput, TemplateLayout } from "./types.js";
import { defaultSubtitleForCategory } from "./productSubtitle.js";

const defaultCategory = "gresie" as const;

export const TEMPLATE_EXPORT_WIDTH = 2938;
export const TEMPLATE_EXPORT_HEIGHT = 2463;

export const defaultProduct: ProductInput = {
  productName: "",
  category: defaultCategory,
  subtitle: defaultSubtitleForCategory(defaultCategory),
  price: 0,
  unit: unitForCategory(defaultCategory),
  features: [],
  description: "",
  sizeWidth: "",
  sizeHeight: "",
  productImagePath: "",
};

export const defaultTemplate: TemplateLayout = {
  id: "manacat-default",
  name: "Template Manacat 2938x2463",
  width: TEMPLATE_EXPORT_WIDTH,
  height: TEMPLATE_EXPORT_HEIGHT,
  backgroundImagePath: "",
  productLayer: {
    x: 1663,
    y: 231,
    width: 925,
    height: 1960,
  },
  textBlocks: {
    productName: {
      id: "productName",
      x: 250,
      y: 300,
      maxWidth: 1313,
      fontSize: 194,
      lineHeight: 1.02,
      fill: "#ffffff",
      weight: 700,
      fitMode: "shrinkSingleLine",
    },
    subtitle: {
      id: "subtitle",
      x: 250,
      y: 556,
      maxWidth: 1000,
      fontSize: 153,
      lineHeight: 1.03,
      fill: "#ffffff",
      weight: 700,
      fitMode: "shrinkSingleLine",
    },
    description: {
      id: "description",
      x: 250,
      y: 894,
      maxWidth: 1281,
      fontSize: 69,
      lineHeight: 1.25,
      fill: "#ffffff",
      weight: 400,
      fitMode: "shrinkWrap",
    },
    price: {
      id: "price",
      x: 263,
      y: 1760,
      maxWidth: 813,
      fontSize: 238,
      lineHeight: 1,
      fill: "#ffffff",
      weight: 800,
      fitMode: "shrinkSingleLine",
    },
    unit: {
      id: "unit",
      x: 844,
      y: 1798,
      maxWidth: 438,
      fontSize: 166,
      lineHeight: 1,
      fill: "#ffffff",
      weight: 600,
      fitMode: "shrinkSingleLine",
    },
    size: {
      id: "size",
      x: 263,
      y: 2180,
      maxWidth: 688,
      fontSize: 125,
      lineHeight: 1,
      fill: "#ffffff",
      weight: 700,
      fitMode: "shrinkSingleLine",
    },
    feature: {
      id: "feature",
      x: 906,
      y: 2180,
      maxWidth: 713,
      fontSize: 125,
      lineHeight: 1,
      fill: "#ffffff",
      weight: 700,
      fitMode: "shrinkSingleLine",
    },
  },
};
