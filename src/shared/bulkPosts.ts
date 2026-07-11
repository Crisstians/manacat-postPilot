import { defaultProduct, defaultTemplate } from "./defaults";
import type { PostDraft } from "./types";

export const createPostDraft = (backgroundImagePath = ""): PostDraft => ({
  id: crypto.randomUUID(),
  product: { ...defaultProduct },
  template: {
    ...defaultTemplate,
    backgroundImagePath,
  },
});
