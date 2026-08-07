import { parsePmanDocument, serializePmanDocument, type PmanParseResult } from "../../shared/pmanDocument";
import type { WorkSessionSnapshot } from "../../shared/draftStorage";
import type { PostDraft, ProductInput, TemplateLayout } from "../../shared/types";
import { prepareWorkSessionForPersistence } from "./draftPersistence";

export type PmanFileResult =
  | { success: true; filePath: string; content?: string }
  | { success: false; canceled?: boolean; error?: string };

const blobOrUrlToDataUrl = async (source: string): Promise<string> => {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Nu s-a putut citi imaginea (${response.status}).`);
  }
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : source);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Nu s-a putut serializa imaginea."));
    reader.readAsDataURL(blob);
  });
};

/** Embed local/blob/fetchable images so .pman files are portable across machines. */
export const embedImageRefForPman = async (imageRef: string): Promise<string> => {
  if (!imageRef || imageRef.startsWith("data:")) return imageRef;

  if (imageRef.startsWith("blob:")) {
    try {
      return await blobOrUrlToDataUrl(imageRef);
    } catch {
      return imageRef;
    }
  }

  if (imageRef.startsWith("http://") || imageRef.startsWith("https://")) {
    try {
      return await blobOrUrlToDataUrl(imageRef);
    } catch {
      return imageRef;
    }
  }

  if (window.manacatApi?.readImageAsDataUrl) {
    const result = await window.manacatApi.readImageAsDataUrl(imageRef);
    if (result.success) return result.dataUrl;
  }

  if (window.manacatApi?.toFileUrl) {
    try {
      return await blobOrUrlToDataUrl(window.manacatApi.toFileUrl(imageRef));
    } catch {
      // fall through
    }
  }

  try {
    return await blobOrUrlToDataUrl(imageRef);
  } catch {
    return imageRef;
  }
};

const embedProductImages = async (product: ProductInput): Promise<ProductInput> => {
  const productImagePath = product.productImagePath
    ? await embedImageRefForPman(product.productImagePath)
    : "";
  const productImageProcessedPath = product.productImageProcessedPath
    ? await embedImageRefForPman(product.productImageProcessedPath)
    : undefined;

  return {
    ...product,
    productImagePath,
    productImageProcessedPath: productImageProcessedPath || undefined,
  };
};

const embedTemplateImages = async (template: TemplateLayout): Promise<TemplateLayout> => {
  if (!template.backgroundImagePath) return template;
  const backgroundImagePath = await embedImageRefForPman(template.backgroundImagePath);
  if (backgroundImagePath === template.backgroundImagePath) return template;
  return { ...template, backgroundImagePath };
};

const embedDraftImages = async (draft: PostDraft): Promise<PostDraft> => ({
  ...draft,
  product: await embedProductImages(draft.product),
  template: await embedTemplateImages(draft.template),
});

export const prepareWorkSessionForPman = async (
  snapshot: Omit<WorkSessionSnapshot, "version" | "savedAt">,
  defaultBackground: string,
): Promise<WorkSessionSnapshot> => {
  const prepared = await prepareWorkSessionForPersistence(snapshot, defaultBackground);
  const drafts = await Promise.all(prepared.drafts.map(embedDraftImages));
  return { ...prepared, drafts };
};

export const buildPmanFileContent = async (
  snapshot: Omit<WorkSessionSnapshot, "version" | "savedAt">,
  defaultBackground: string,
): Promise<string> => {
  const prepared = await prepareWorkSessionForPman(snapshot, defaultBackground);
  return serializePmanDocument(prepared);
};

export const parsePmanFileContent = (content: string): PmanParseResult => parsePmanDocument(content);

export const savePmanToDisk = async (
  content: string,
  existingPath: string | null,
  forceDialog: boolean,
): Promise<PmanFileResult> => {
  if (window.manacatApi?.savePman) {
    return window.manacatApi.savePman({
      content,
      filePath: forceDialog ? null : existingPath,
    });
  }

  // Browser fallback: always download
  try {
    const suggestedName =
      existingPath?.replace(/^.*[/\\]/, "") || "document.pman";
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "Manacat PostPilot",
            accept: { "application/json": [".pman"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, filePath: handle.name };
    }

    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = suggestedName.endsWith(".pman") ? suggestedName : `${suggestedName}.pman`;
    anchor.click();
    URL.revokeObjectURL(url);
    return { success: true, filePath: anchor.download };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, canceled: true };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Salvare eșuată.",
    };
  }
};

export const openPmanFromDisk = async (): Promise<PmanFileResult & { content?: string }> => {
  if (window.manacatApi?.openPman) {
    return window.manacatApi.openPman();
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pman,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ success: false, canceled: true });
        return;
      }
      try {
        const content = await file.text();
        resolve({ success: true, filePath: file.name, content });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "Nu s-a putut citi fișierul.",
        });
      }
    };
    input.oncancel = () => resolve({ success: false, canceled: true });
    input.click();
  });
};

export const readPmanPath = async (filePath: string): Promise<PmanFileResult & { content?: string }> => {
  if (window.manacatApi?.readPmanPath) {
    return window.manacatApi.readPmanPath(filePath);
  }
  return { success: false, error: "Deschiderea din path este disponibilă doar în aplicația desktop." };
};
