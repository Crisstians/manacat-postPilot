import JSZip from "jszip";
import { generateCaption } from "../../services/captionGenerator";
import type { BulkExportMode, BulkExportResult, ProductInput } from "../../shared/types";
import type { PostCanvasHandle } from "../components/konva/PostCanvas";
import { dataUrlToBlob, waitForPreviewPaint } from "./postImage";

const slugifyProductName = (productName: string): string => {
  const slug = productName.trim().replace(/\s+/g, "-").toLowerCase();
  return slug || "postare-manacat";
};

const uniqueBaseNames = (products: ProductInput[]): string[] => {
  const used = new Map<string, number>();
  return products.map((product, index) => {
    const base = slugifyProductName(product.productName);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    if (count === 1) {
      const collisionAhead = products.some(
        (other, otherIndex) =>
          otherIndex > index && slugifyProductName(other.productName) === base,
      );
      if (!collisionAhead) return base;
    }
    return `${base}-${index + 1}`;
  });
};

const downloadBlob = (blob: Blob, fileName: string): void => {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
};

export interface BrowserBulkExportItem {
  product: ProductInput;
  pngBlob: Blob;
  caption: string;
}

/** Destination must be picked during the click gesture, before long async render work. */
export type BrowserBulkDestination =
  | { kind: "directory"; handle: FileSystemDirectoryHandle }
  | { kind: "zip-file"; handle: FileSystemFileHandle }
  | { kind: "zip-download"; fileName: string };

export type BrowserBulkPickResult =
  | { success: true; destination: BrowserBulkDestination; note?: string }
  | { success: false; error: string };

/**
 * Opens folder/ZIP picker immediately (must stay in the user-gesture stack).
 * Call this before any long await (render/compose).
 */
export const pickBrowserBulkDestination = async (
  mode: BulkExportMode,
  postCount: number,
): Promise<BrowserBulkPickResult> => {
  if (mode === "folder") {
    if (typeof window.showDirectoryPicker === "function") {
      try {
        const handle = await window.showDirectoryPicker();
        return { success: true, destination: { kind: "directory", handle } };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return { success: false, error: "Export anulat." };
        }
        throw error;
      }
    }
    // Fall through to ZIP when directory picker is unavailable.
  }

  const zipName = `lot-manacat-${postCount}-postari.zip`;
  const folderFallbackNote =
    mode === "folder"
      ? "Alegerea de folder nu e disponibilă aici — salvăm ca ZIP."
      : undefined;

  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: zipName,
        types: [{ description: "ZIP Archive", accept: { "application/zip": [".zip"] } }],
      });
      return {
        success: true,
        destination: { kind: "zip-file", handle },
        note: folderFallbackNote,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { success: false, error: "Export anulat." };
      }
      throw error;
    }
  }

  return {
    success: true,
    destination: { kind: "zip-download", fileName: zipName },
    note: folderFallbackNote,
  };
};

/** Renders full Konva images for every draft (browser path — no Sharp). */
export const renderAllDraftFullPngs = async (
  drafts: Array<{ product: ProductInput }>,
  previewRef: PostCanvasHandle | null,
  setActiveIndex: (index: number) => void,
  onProgress?: (current: number, total: number) => void,
): Promise<BrowserBulkExportItem[]> => {
  const items: BrowserBulkExportItem[] = [];
  const { flushSync } = await import("react-dom");

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index]!;
    flushSync(() => setActiveIndex(index));
    await waitForPreviewPaint();
    onProgress?.(index + 1, drafts.length);
    const dataUrl = await previewRef?.exportFullImage();
    if (!dataUrl) {
      throw new Error(`Nu s-a putut genera imaginea pentru postarea ${index + 1}.`);
    }
    items.push({
      product: draft.product,
      pngBlob: await dataUrlToBlob(dataUrl),
      caption: generateCaption(draft.product),
    });
  }

  return items;
};

export const writeBulkToBrowserDestination = async (
  destination: BrowserBulkDestination,
  items: BrowserBulkExportItem[],
): Promise<BulkExportResult> => {
  if (items.length === 0) {
    return { success: false, error: "Nu există postări de exportat." };
  }

  const baseNames = uniqueBaseNames(items.map((item) => item.product));

  if (destination.kind === "directory") {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]!;
      const baseName = baseNames[index]!;
      const pngHandle = await destination.handle.getFileHandle(`${baseName}.png`, {
        create: true,
      });
      const pngWritable = await pngHandle.createWritable();
      await pngWritable.write(item.pngBlob);
      await pngWritable.close();

      const txtHandle = await destination.handle.getFileHandle(`${baseName}.txt`, {
        create: true,
      });
      const txtWritable = await txtHandle.createWritable();
      await txtWritable.write(item.caption);
      await txtWritable.close();
    }
    return {
      success: true,
      outputPath: "folder selectat",
      exportedCount: items.length,
    };
  }

  const zip = new JSZip();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;
    const baseName = baseNames[index]!;
    zip.file(`${baseName}.png`, item.pngBlob);
    zip.file(`${baseName}.txt`, item.caption);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });

  if (destination.kind === "zip-file") {
    const writable = await destination.handle.createWritable();
    await writable.write(zipBlob);
    await writable.close();
    return {
      success: true,
      outputPath: destination.handle.name,
      exportedCount: items.length,
    };
  }

  downloadBlob(zipBlob, destination.fileName);
  return {
    success: true,
    outputPath: destination.fileName,
    exportedCount: items.length,
  };
};
