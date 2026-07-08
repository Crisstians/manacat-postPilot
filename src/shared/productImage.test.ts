import { describe, expect, it } from "vitest";
import {
  getDisplayProductImagePath,
  hasRemovedBackground,
  needsBase64Export,
} from "./productImage.js";
import type { ProductInput } from "./types.js";

const baseProduct: ProductInput = {
  productName: "Test",
  category: "gresie",
  price: 10,
  unit: "m²",
  features: [],
  description: "Desc",
  sizeWidth: "60",
  sizeHeight: "120",
  productImagePath: "/tmp/original.jpg",
};

describe("productImage", () => {
  it("prefers processed image path for display", () => {
    const product = {
      ...baseProduct,
      productImageProcessedPath: "blob:processed",
    };

    expect(getDisplayProductImagePath(product)).toBe("blob:processed");
  });

  it("detects removed background state", () => {
    expect(hasRemovedBackground(baseProduct)).toBe(false);
    expect(
      hasRemovedBackground({ ...baseProduct, productImageProcessedPath: "blob:processed" }),
    ).toBe(true);
  });

  it("detects blob and data urls for base64 export", () => {
    expect(needsBase64Export("blob:abc")).toBe(true);
    expect(needsBase64Export("data:image/png;base64,abc")).toBe(true);
    expect(needsBase64Export("/tmp/product.png")).toBe(false);
  });
});
