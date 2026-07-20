import { createPostDraft } from "./bulkPosts";
import type { PostDraft, ProductInput } from "./types";
import { MAX_BULK_POSTS } from "./types";

export const DRAFT_STORAGE_VERSION = 1 as const;

export type WorkSessionPanel = "product" | "template";

export interface WorkSessionSnapshot {
  version: typeof DRAFT_STORAGE_VERSION;
  savedAt: string;
  activeIndex: number;
  activePanel: WorkSessionPanel;
  bulkCaption: string;
  bulkCaptionTouched: boolean;
  drafts: PostDraft[];
}

export const draftStorageKey = (userId: string): string =>
  `postpilot.workSession.v${DRAFT_STORAGE_VERSION}.${userId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const clearEphemeralImageRef = (path: unknown): string => {
  if (typeof path !== "string" || !path) return "";
  if (path.startsWith("blob:")) return "";
  return path;
};

export const sanitizeProductForLoad = (product: ProductInput): ProductInput => {
  const processedPath = clearEphemeralImageRef(product.productImageProcessedPath);
  return {
    ...product,
    hasDiscount: Boolean(product.hasDiscount),
    hasNewProduct: Boolean(product.hasNewProduct),
    originalPrice:
      typeof product.originalPrice === "number" && Number.isFinite(product.originalPrice)
        ? product.originalPrice
        : 0,
    productImagePath: clearEphemeralImageRef(product.productImagePath),
    productImageProcessedPath: processedPath || undefined,
  };
};

export const sanitizeDraftForLoad = (draft: PostDraft): PostDraft => ({
  ...draft,
  product: sanitizeProductForLoad(draft.product),
});

const parseDraft = (value: unknown): PostDraft | null => {
  if (!isRecord(value) || !isRecord(value.product) || !isRecord(value.template)) return null;

  const id = isNonEmptyString(value.id) ? value.id : crypto.randomUUID();
  const facebookCaption = typeof value.facebookCaption === "string" ? value.facebookCaption : "";
  const facebookCaptionTouched = Boolean(value.facebookCaptionTouched);

  return sanitizeDraftForLoad({
    id,
    product: value.product as unknown as ProductInput,
    template: value.template as unknown as PostDraft["template"],
    facebookCaption,
    facebookCaptionTouched,
  });
};

export const createEmptyWorkSession = (defaultBackground = ""): WorkSessionSnapshot => ({
  version: DRAFT_STORAGE_VERSION,
  savedAt: new Date().toISOString(),
  activeIndex: 0,
  activePanel: "product",
  bulkCaption: "",
  bulkCaptionTouched: false,
  drafts: [createPostDraft(defaultBackground)],
});

export const normalizeWorkSession = (
  snapshot: WorkSessionSnapshot,
  defaultBackground: string,
): WorkSessionSnapshot => {
  const drafts =
    snapshot.drafts.length > 0
      ? snapshot.drafts.slice(0, MAX_BULK_POSTS).map(sanitizeDraftForLoad)
      : [createPostDraft(defaultBackground)];

  const activeIndex = Math.min(Math.max(snapshot.activeIndex, 0), drafts.length - 1);
  const activePanel: WorkSessionPanel = snapshot.activePanel === "template" ? "template" : "product";

  return {
    version: DRAFT_STORAGE_VERSION,
    savedAt: snapshot.savedAt,
    activeIndex,
    activePanel,
    bulkCaption: snapshot.bulkCaption,
    bulkCaptionTouched: snapshot.bulkCaptionTouched,
    drafts,
  };
};

export const parseWorkSession = (raw: string | null): WorkSessionSnapshot | null => {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== DRAFT_STORAGE_VERSION) return null;
    if (!Array.isArray(parsed.drafts)) return null;

    const drafts = parsed.drafts
      .map(parseDraft)
      .filter((draft): draft is PostDraft => draft !== null)
      .slice(0, MAX_BULK_POSTS);

    if (drafts.length === 0) return null;

    const activeIndex = typeof parsed.activeIndex === "number" ? parsed.activeIndex : 0;
    const activePanel: WorkSessionPanel =
      parsed.activePanel === "template" ? "template" : "product";
    const bulkCaption = typeof parsed.bulkCaption === "string" ? parsed.bulkCaption : "";
    const bulkCaptionTouched = Boolean(parsed.bulkCaptionTouched);
    const savedAt =
      typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString();

    return normalizeWorkSession(
      {
        version: DRAFT_STORAGE_VERSION,
        savedAt,
        activeIndex,
        activePanel,
        bulkCaption,
        bulkCaptionTouched,
        drafts,
      },
      "",
    );
  } catch {
    return null;
  }
};

export const hasMeaningfulWorkSession = (snapshot: WorkSessionSnapshot): boolean => {
  if (snapshot.drafts.length > 1) return true;
  if (snapshot.bulkCaptionTouched && snapshot.bulkCaption.trim()) return true;

  return snapshot.drafts.some((draft) => {
    const { product } = draft;
    return (
      Boolean(product.productName.trim()) ||
      product.price > 0 ||
      Boolean(product.productImagePath) ||
      Boolean(product.description.trim()) ||
      Boolean(product.features[0]) ||
      Boolean(product.sizeWidth && product.sizeHeight) ||
      draft.facebookCaptionTouched
    );
  });
};
