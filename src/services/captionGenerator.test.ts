import { describe, expect, it } from "vitest";
import { generateCaption } from "./captionGenerator";

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
});
