import { describe, expect, it } from "vitest";
import { createPostDraft } from "./bulkPosts";
import {
  createEmptyWorkSession,
  hasMeaningfulWorkSession,
  parseWorkSession,
  sanitizeProductForLoad,
} from "./draftStorage";
import { defaultProduct } from "./defaults";

describe("draftStorage", () => {
  it("clears blob image refs on load", () => {
    const product = sanitizeProductForLoad({
      ...defaultProduct,
      productImagePath: "blob:http://localhost/abc",
      productImageProcessedPath: "blob:http://localhost/def",
    });

    expect(product.productImagePath).toBe("");
    expect(product.productImageProcessedPath).toBeUndefined();
  });

  it("keeps data urls and file paths on load", () => {
    const product = sanitizeProductForLoad({
      ...defaultProduct,
      productImagePath: "data:image/png;base64,abc",
      productImageProcessedPath: "C:\\images\\cutout.png",
    });

    expect(product.productImagePath).toBe("data:image/png;base64,abc");
    expect(product.productImageProcessedPath).toBe("C:\\images\\cutout.png");
  });

  it("parses a valid snapshot", () => {
    const draft = createPostDraft("/assets/template1.png");
    draft.product.productName = "Marfil Bianco";

    const raw = JSON.stringify({
      version: 1,
      savedAt: "2026-07-11T12:00:00.000Z",
      activeIndex: 0,
      activePanel: "product",
      bulkCaption: "",
      bulkCaptionTouched: false,
      drafts: [draft],
    });

    const parsed = parseWorkSession(raw);
    expect(parsed?.drafts[0]?.product.productName).toBe("Marfil Bianco");
    expect(parsed?.activePanel).toBe("product");
  });

  it("detects meaningful sessions", () => {
    const empty = createEmptyWorkSession();
    expect(hasMeaningfulWorkSession(empty)).toBe(false);

    const withName = createEmptyWorkSession();
    withName.drafts[0]!.product.productName = "Test";
    expect(hasMeaningfulWorkSession(withName)).toBe(true);
  });
});
