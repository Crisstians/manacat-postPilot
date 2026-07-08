import type { ProductInput } from "./types.js";

export const getDisplayProductImagePath = (product: ProductInput): string =>
  product.productImageProcessedPath ?? product.productImagePath;

export const hasRemovedBackground = (product: ProductInput): boolean =>
  Boolean(product.productImageProcessedPath);

export const revokeBlobUrl = (url?: string): void => {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

export const needsBase64Export = (source: string): boolean =>
  source.startsWith("blob:") || source.startsWith("data:");

export const resolveProductImageSource = (
  imagePath: string,
  toFileUrl?: (filePath: string) => string,
): string => {
  if (/^(blob:|data:|https?:|file:|\/)/.test(imagePath)) {
    return imagePath;
  }

  return toFileUrl ? toFileUrl(imagePath) : imagePath;
};

export const imageSourceToBase64 = async (source: string): Promise<string> => {
  const response = await fetch(source);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return btoa(binary);
};
