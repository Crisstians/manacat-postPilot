import {
  createEmptyWorkSession,
  draftStorageKey,
  DRAFT_STORAGE_VERSION,
  hasMeaningfulWorkSession,
  normalizeWorkSession,
  parseWorkSession,
  type WorkSessionSnapshot,
} from "../../shared/draftStorage";
import type { PostDraft, ProductInput } from "../../shared/types";

const toPersistableImageRef = async (path: string): Promise<string> => {
  if (!path || path.startsWith("data:")) return path;
  if (!path.startsWith("blob:")) return path;

  const response = await fetch(path);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : path);
    reader.onerror = () => reject(reader.error ?? new Error("Nu s-a putut serializa imaginea."));
    reader.readAsDataURL(blob);
  });
};

const prepareProductForStorage = async (product: ProductInput): Promise<ProductInput> => {
  const productImagePath = product.productImagePath
    ? await toPersistableImageRef(product.productImagePath)
    : "";
  const productImageProcessedPath = product.productImageProcessedPath
    ? await toPersistableImageRef(product.productImageProcessedPath)
    : undefined;

  return {
    ...product,
    productImagePath,
    productImageProcessedPath: productImageProcessedPath || undefined,
  };
};

const prepareDraftForStorage = async (draft: PostDraft): Promise<PostDraft> => ({
  ...draft,
  product: await prepareProductForStorage(draft.product),
});

export const prepareWorkSessionForPersistence = async (
  snapshot: Omit<WorkSessionSnapshot, "version" | "savedAt">,
  defaultBackground: string,
): Promise<WorkSessionSnapshot> => {
  const drafts = await Promise.all(snapshot.drafts.map(prepareDraftForStorage));
  return normalizeWorkSession(
    {
      version: DRAFT_STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      activeIndex: snapshot.activeIndex,
      activePanel: snapshot.activePanel,
      bulkCaption: snapshot.bulkCaption,
      bulkCaptionTouched: snapshot.bulkCaptionTouched,
      drafts,
    },
    defaultBackground,
  );
};

export const loadWorkSession = (
  userId: string,
  defaultBackground: string,
): { session: WorkSessionSnapshot; restored: boolean } => {
  const raw = localStorage.getItem(draftStorageKey(userId));
  const parsed = parseWorkSession(raw);
  if (!parsed) {
    return {
      session: createEmptyWorkSession(defaultBackground),
      restored: false,
    };
  }

  const session = normalizeWorkSession(parsed, defaultBackground);
  return {
    session,
    restored: hasMeaningfulWorkSession(session),
  };
};

export const saveWorkSession = async (
  userId: string,
  snapshot: Omit<WorkSessionSnapshot, "version" | "savedAt">,
  defaultBackground: string,
): Promise<void> => {
  const payload = await prepareWorkSessionForPersistence(snapshot, defaultBackground);

  try {
    localStorage.setItem(draftStorageKey(userId), JSON.stringify(payload));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new DraftStorageQuotaError();
    }
    throw error;
  }
};

export class DraftStorageQuotaError extends Error {
  constructor(message = "Spațiul local pentru draft este plin.") {
    super(message);
    this.name = "DraftStorageQuotaError";
  }
}

export const isDraftStorageQuotaError = (error: unknown): error is DraftStorageQuotaError =>
  error instanceof DraftStorageQuotaError ||
  (error instanceof DOMException && error.name === "QuotaExceededError");
