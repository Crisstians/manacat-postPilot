import { describe, expect, it } from "vitest";
import { generateBulkCaption, generateCaption } from "./captionGenerator";

describe("generateCaption", () => {
  it("includes product details and hashtags", () => {
    const result = generateCaption({
      productName: "Marfil Bianco",
      category: "gresie",
      price: 49.99,
      unit: "m²",
      features: ["Sculptat", "Rectificat"],
      description: "Placare premium",
      sizeWidth: "60",
      sizeHeight: "120",
      productImagePath: "/tmp/product.png",
    });

    expect(result).toContain("Marfil Bianco");
    expect(result).toContain("49.99");
    expect(result).toContain("#Manacat");
    expect(result).toContain("#Gresie");
  });

  it("combines multiple products into one bulk caption", () => {
    const result = generateBulkCaption([
      {
        productName: "Greco",
        category: "gresie",
        price: 60.99,
        unit: "m²",
        features: [],
        description: "",
        sizeWidth: "",
        sizeHeight: "",
        productImagePath: "",
      },
      {
        productName: "Alba",
        category: "faianta",
        price: 45.5,
        unit: "m²",
        features: [],
        description: "",
        sizeWidth: "",
        sizeHeight: "",
        productImagePath: "",
      },
    ]);

    expect(result).toContain("2 produse");
    expect(result).toContain("1. Greco");
    expect(result).toContain("2. Alba");
  });
});
