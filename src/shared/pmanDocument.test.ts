import { describe, expect, it } from "vitest";
import { createPostDraft } from "./bulkPosts";
import {
  buildPmanDocument,
  parsePmanDocument,
  serializePmanDocument,
  formatWindowTitle,
  documentDisplayName,
} from "./pmanDocument";

describe("pmanDocument", () => {
  it("round-trips a product work session", () => {
    const draft = createPostDraft("/assets/template1.png");
    draft.product.productName = "Marfil Bianco";
    draft.product.price = 89.9;

    const raw = serializePmanDocument({
      savedAt: "2026-08-06T12:00:00.000Z",
      activeIndex: 0,
      activePanel: "product",
      bulkCaption: "Lot demo",
      bulkCaptionTouched: true,
      drafts: [draft],
    });

    const parsed = parsePmanDocument(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.document.format).toBe("pman");
    expect(parsed.document.postType).toBe("product");
    expect(parsed.document.version).toBe(1);
    expect(parsed.session.drafts[0]?.product.productName).toBe("Marfil Bianco");
    expect(parsed.session.bulkCaption).toBe("Lot demo");
    expect(parsed.session.bulkCaptionTouched).toBe(true);
  });

  it("rejects non-pman payloads", () => {
    const result = parsePmanDocument(JSON.stringify({ format: "other", version: 1 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/PostPilot/i);
  });

  it("rejects wrong postType", () => {
    const draft = createPostDraft("/assets/template1.png");
    const doc = {
      ...buildPmanDocument({
        savedAt: "2026-08-06T12:00:00.000Z",
        activeIndex: 0,
        activePanel: "product",
        bulkCaption: "",
        bulkCaptionTouched: false,
        drafts: [draft],
      }),
      postType: "shop",
    };

    const result = parsePmanDocument(JSON.stringify(doc));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/produs/i);
  });

  it("rejects invalid json", () => {
    const result = parsePmanDocument("{not-json");
    expect(result.ok).toBe(false);
  });

  it("formats window title with dirty marker", () => {
    expect(documentDisplayName(null)).toBe("Document nou");
    expect(documentDisplayName("C:\\docs\\promo.pman")).toBe("promo.pman");
    expect(formatWindowTitle(null, true)).toBe("Document nou* - Manacat PostPilot");
    expect(formatWindowTitle("C:/work/lot.pman", false)).toBe("lot.pman - Manacat PostPilot");
  });
});
