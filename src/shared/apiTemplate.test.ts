import { describe, expect, it } from "vitest";
import { looksLikeApiTemplateId, templateLayoutFromApi } from "./apiTemplate";
import type { ApiTemplateDetail } from "./apiTemplate";

const sampleDetail = (overrides: Partial<ApiTemplateDetail> = {}): ApiTemplateDetail => ({
  id: "clxxxxxxxxxxxxxxxxxxxxxx",
  name: "Promo",
  slug: "promo",
  kind: "product",
  width: 2938,
  height: 2463,
  imageUrl: "https://example.com/uploads/templates/a.png",
  imageKey: "a.png",
  isActive: true,
  sortOrder: 0,
  updatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  createdByUserId: null,
  layout: {
    id: "layout-1",
    name: "Promo",
    width: 2938,
    height: 2463,
    productLayer: { x: 1, y: 2, width: 3, height: 4 },
    textBlocks: {
      productName: {
        id: "productName",
        x: 0,
        y: 0,
        maxWidth: 100,
        height: 40,
        fontSize: 20,
        lineHeight: 1,
        fill: "#fff",
      },
      subtitle: {
        id: "subtitle",
        x: 0,
        y: 0,
        maxWidth: 100,
        height: 40,
        fontSize: 20,
        lineHeight: 1,
        fill: "#fff",
      },
      description: {
        id: "description",
        x: 0,
        y: 0,
        maxWidth: 100,
        height: 40,
        fontSize: 20,
        lineHeight: 1,
        fill: "#fff",
      },
      price: {
        id: "price",
        x: 0,
        y: 0,
        maxWidth: 100,
        height: 40,
        fontSize: 20,
        lineHeight: 1,
        fill: "#fff",
      },
      unit: {
        id: "unit",
        x: 0,
        y: 0,
        maxWidth: 100,
        height: 40,
        fontSize: 20,
        lineHeight: 1,
        fill: "#fff",
      },
      size: {
        id: "size",
        x: 0,
        y: 0,
        maxWidth: 100,
        height: 40,
        fontSize: 20,
        lineHeight: 1,
        fill: "#fff",
      },
      feature: {
        id: "feature",
        x: 0,
        y: 0,
        maxWidth: 100,
        height: 40,
        fontSize: 20,
        lineHeight: 1,
        fill: "#fff",
      },
    },
  },
  ...overrides,
});

describe("templateLayoutFromApi", () => {
  it("maps imageUrl to backgroundImagePath and keeps geometry", () => {
    const layout = templateLayoutFromApi(sampleDetail());
    expect(layout.backgroundImagePath).toBe("https://example.com/uploads/templates/a.png");
    expect(layout.id).toBe("clxxxxxxxxxxxxxxxxxxxxxx");
    expect(layout.productLayer.width).toBe(3);
    expect(layout.textBlocks.productName.fitMode).toBe("boxFit");
  });
});

describe("looksLikeApiTemplateId", () => {
  it("rejects local default ids", () => {
    expect(looksLikeApiTemplateId("manacat-default")).toBe(false);
    expect(looksLikeApiTemplateId("announcement-2938x2463")).toBe(false);
  });

  it("accepts cuid-like ids", () => {
    expect(looksLikeApiTemplateId("clxxxxxxxxxxxxxxxxxxxxxx")).toBe(true);
  });
});
