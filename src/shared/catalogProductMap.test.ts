import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "../services/productsApi.js";
import { defaultProduct } from "./defaults.js";
import {
  catalogDescription,
  catalogDisplayName,
  catalogPrimaryImage,
  mapCatalogCategory,
  mapCatalogProductToInput,
} from "./catalogProductMap.js";
import { PRODUCT_FIELD_LIMITS } from "./productFieldLimits.js";
import { defaultSubtitleForCategory } from "./productSubtitle.js";
import { unitForCategory } from "./categoryUnits.js";

const baseCatalog = (overrides: Partial<CatalogProduct> = {}): CatalogProduct => ({
  productId: 12345,
  sku: "SKU-99",
  name: "Nume ERP foarte lung care depaseste limita de caractere din template",
  nameAlt: "",
  brand: "Brand",
  category: "Gresie",
  price: 49.99,
  shortDescription: "",
  description: "",
  image: "",
  images: [],
  ...overrides,
});

describe("catalogProductMap", () => {
  it("prefers nameAlt over name for display", () => {
    expect(catalogDisplayName(baseCatalog({ nameAlt: "Marfil Bianco" }))).toBe("Marfil Bianco");
    expect(catalogDisplayName(baseCatalog({ nameAlt: "" }))).toBe(
      "Nume ERP foarte lung care depaseste limita de caractere din template",
    );
  });

  it("prefers shortDescription over description", () => {
    expect(
      catalogDescription(
        baseCatalog({ shortDescription: "Scurt", description: "Lung" }),
      ),
    ).toBe("Scurt");
    expect(catalogDescription(baseCatalog({ description: "Doar lung" }))).toBe("Doar lung");
  });

  it("picks primary image from image or images[0]", () => {
    expect(catalogPrimaryImage(baseCatalog({ image: "https://a/img.png" }))).toBe(
      "https://a/img.png",
    );
    expect(
      catalogPrimaryImage(baseCatalog({ images: ["https://b/first.png", "https://b/second.png"] })),
    ).toBe("https://b/first.png");
  });

  it("maps nameAlt, price, description and image; truncates name and description", () => {
    const longDesc = "x".repeat(200);
    const mapped = mapCatalogProductToInput(
      baseCatalog({
        nameAlt: "Alt Name That Is Also Quite Long For The Graphic",
        price: 12.5,
        shortDescription: longDesc,
        image: "https://cdn.example/p.png",
      }),
      defaultProduct,
    );

    expect(mapped.productName.length).toBeLessThanOrEqual(PRODUCT_FIELD_LIMITS.productName);
    expect(mapped.productName).toBe(
      "Alt Name That Is Also Quite Long For The Graphic".slice(0, PRODUCT_FIELD_LIMITS.productName),
    );
    expect(mapped.price).toBe(12.5);
    expect(mapped.description.length).toBe(PRODUCT_FIELD_LIMITS.description);
    expect(mapped.productImagePath).toBe("https://cdn.example/p.png");
  });

  it("skips empty catalog fields and preserves badges; maps known ERP category", () => {
    const current = {
      ...defaultProduct,
      productName: "Păstrat",
      category: "parchet" as const,
      features: ["Clasa 32"],
      subtitle: "Subtitlu custom",
      description: "Descriere existentă",
      price: 10,
      hasDiscount: true,
      hasNewProduct: true,
      originalPrice: 20,
      productImagePath: "blob:local",
    };

    const mapped = mapCatalogProductToInput(
      baseCatalog({
        name: "",
        nameAlt: "",
        price: 0,
        description: "",
        shortDescription: "",
        image: "",
        images: [],
        category: "Gresie",
      }),
      current,
    );

    expect(mapped.productName).toBe("Păstrat");
    expect(mapped.price).toBe(10);
    expect(mapped.description).toBe("Descriere existentă");
    expect(mapped.productImagePath).toBe("blob:local");
    expect(mapped.category).toBe("gresie");
    expect(mapped.unit).toBe(unitForCategory("gresie"));
    expect(mapped.features).toEqual([]);
    expect(mapped.subtitle).toBe(defaultSubtitleForCategory("gresie"));
    expect(mapped.hasDiscount).toBe(true);
    expect(mapped.hasNewProduct).toBe(true);
    expect(mapped.originalPrice).toBe(20);
  });

  it("maps unclear ERP category to produs-general", () => {
    expect(mapCatalogCategory("")).toBe("produs-general");
    expect(mapCatalogCategory("Sanitare")).toBe("produs-general");
    expect(mapCatalogCategory("Gresie porțelanată")).toBe("gresie");
    expect(mapCatalogCategory("Faianță baie")).toBe("faianta");
    expect(mapCatalogCategory("Adezivi C2")).toBe("adezivi");

    const mapped = mapCatalogProductToInput(
      baseCatalog({ category: "Instalații electrice", nameAlt: "Cablu" }),
      defaultProduct,
    );

    expect(mapped.category).toBe("produs-general");
    expect(mapped.unit).toBe(unitForCategory("produs-general"));
    expect(mapped.subtitle).toBe(defaultSubtitleForCategory("produs-general"));
  });

  it("overwrites name/price when catalog has values", () => {
    const mapped = mapCatalogProductToInput(
      baseCatalog({ nameAlt: "Nou", price: 99 }),
      { ...defaultProduct, productName: "Vechi", price: 1 },
    );

    expect(mapped.productName).toBe("Nou");
    expect(mapped.price).toBe(99);
  });
});
