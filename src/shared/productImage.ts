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

const isWebImagePath = (imagePath: string): boolean =>
  /^(blob:|data:|https?:|manacat:)/.test(imagePath) ||
  imagePath.startsWith("./") ||
  imagePath.startsWith("/assets/") ||
  imagePath.startsWith("/src/") ||
  imagePath.startsWith("/@");

export const fileUrlToPath = (imagePath: string): string => {
  if (!imagePath.startsWith("file://")) {
    return imagePath;
  }

  let pathname = decodeURIComponent(imagePath.replace(/^file:\/\//, ""));
  if (/^\/[A-Za-z]:/.test(pathname)) {
    pathname = pathname.slice(1);
  }
  return pathname;
};

export const resolveProductImageSource = (
  imagePath: string,
  toFileUrl?: (filePath: string) => string,
): string => {
  if (isWebImagePath(imagePath)) {
    return imagePath;
  }

  const localPath = fileUrlToPath(imagePath);

  if (toFileUrl) {
    try {
      return toFileUrl(localPath);
    } catch {
      return localPath;
    }
  }

  return localPath;
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
