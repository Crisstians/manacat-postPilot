import type { PostCanvasHandle } from "../components/konva/PostCanvas";
import {
  getDisplayProductImagePath,
  imageSourceToBase64,
  needsBase64Export,
} from "../../shared/productImage";
import type { ExportRequest, PostDraft, ProductInput, TemplateLayout } from "../../shared/types";
import { resolveProductImageSource } from "../productImageSource";

export const waitForPreviewPaint = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void document.fonts.ready.then(() => {
          setTimeout(resolve, 180);
        });
      });
    });
  });

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const base64ToBlob = (base64: string, mimeType = "image/png"): Blob => {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }
  return new Blob([buffer], { type: mimeType });
};

export const buildPostRenderRequest = async (
  previewRef: PostCanvasHandle | null,
  product: ProductInput,
  template: TemplateLayout,
): Promise<ExportRequest | null> => {
  const overlayDataUrl = await previewRef?.exportTextOverlay();
  if (!overlayDataUrl) {
    return null;
  }

  const textOverlayPngBase64 = overlayDataUrl.replace(/^data:image\/png;base64,/, "");
  const displayImagePath = getDisplayProductImagePath(product);
  let productImageBase64: string | undefined;
  if (needsBase64Export(displayImagePath)) {
    productImageBase64 = await imageSourceToBase64(resolveProductImageSource(displayImagePath));
  }

  return {
    product,
    template,
    textOverlayPngBase64,
    productImageBase64,
  };
};

export const renderPostImageBlob = async (
  previewRef: PostCanvasHandle | null,
  product: ProductInput,
  template: TemplateLayout,
): Promise<Blob | null> => {
  const request = await buildPostRenderRequest(previewRef, product, template);
  if (!request) {
    return null;
  }

  if (window.manacatApi?.renderPostPng) {
    const result = await window.manacatApi.renderPostPng(request);
    if (!result.success || !result.pngBase64) {
      throw new Error(result.error ?? "Nu s-a putut genera imaginea pentru publicare.");
    }
    return base64ToBlob(result.pngBase64);
  }

  const dataUrl = await previewRef?.exportFullImage();
  if (!dataUrl) {
    return null;
  }
  return dataUrlToBlob(dataUrl);
};

export const renderAllDraftImages = async (
  drafts: PostDraft[],
  previewRef: PostCanvasHandle | null,
  setActiveIndex: (index: number) => void,
): Promise<Blob[]> => {
  const images: Blob[] = [];
  const { flushSync } = await import("react-dom");

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index]!;
    flushSync(() => setActiveIndex(index));
    await waitForPreviewPaint();
    const blob = await renderPostImageBlob(previewRef, draft.product, draft.template);
    if (!blob) {
      throw new Error(`Nu s-a putut genera imaginea pentru postarea ${index + 1}.`);
    }
    images.push(blob);
  }

  return images;
};
