import { defaultProduct, defaultTemplate } from "./defaults";
import type { PostDraft } from "./types";

export const createPostDraft = (backgroundImagePath = ""): PostDraft => ({
  id: crypto.randomUUID(),
  product: { ...defaultProduct },
  template: {
    ...defaultTemplate,
    backgroundImagePath,
  },
  facebookCaption: "",
  facebookCaptionTouched: false,
});

export const duplicatePostDraft = (draft: PostDraft): PostDraft => ({
  id: crypto.randomUUID(),
  product: {
    ...draft.product,
    productImageLayout: draft.product.productImageLayout
      ? { ...draft.product.productImageLayout }
      : undefined,
  },
  template: {
    ...draft.template,
    productLayer: { ...draft.template.productLayer },
  },
  facebookCaption: draft.facebookCaption,
  facebookCaptionTouched: draft.facebookCaptionTouched,
});
