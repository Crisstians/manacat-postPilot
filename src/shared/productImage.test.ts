import { describe, expect, it } from "vitest";
import {
  getDisplayProductImagePath,
  hasRemovedBackground,
  needsBase64Export,
  resolveProductImageSource,
} from "./productImage.js";
import type { ProductInput } from "./types.js";

const baseProduct: ProductInput = {
  productName: "Test",
  category: "gresie",
  subtitle: "Placă ceramică\nPremium",
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

  it("converts absolute filesystem paths through toFileUrl in Electron", () => {
    const toFileUrl = (filePath: string) => `manacat://open/${encodeURIComponent(filePath)}`;

    expect(resolveProductImageSource("/Users/cristian/template1.png", toFileUrl)).toBe(
      "manacat://open/%2FUsers%2Fcristian%2Ftemplate1.png",
    );
    expect(resolveProductImageSource("C:\\templates\\template1.png", toFileUrl)).toBe(
      "manacat://open/C%3A%5Ctemplates%5Ctemplate1.png",
    );
  });

  it("rewrites legacy file urls through toFileUrl in Electron", () => {
    const toFileUrl = (filePath: string) => `manacat://open/${encodeURIComponent(filePath)}`;

    expect(
      resolveProductImageSource("file:///Users/cristian/Downloads/test.png", toFileUrl),
    ).toBe("manacat://open/%2FUsers%2Fcristian%2FDownloads%2Ftest.png");
  });

  it("keeps bundled dev-server asset paths unchanged", () => {
    const toFileUrl = (filePath: string) => `file://${filePath}`;

    expect(resolveProductImageSource("/assets/template1.png", toFileUrl)).toBe(
      "/assets/template1.png",
    );
    expect(resolveProductImageSource("/src/assets/template1.png", toFileUrl)).toBe(
      "/src/assets/template1.png",
    );
  });
});
