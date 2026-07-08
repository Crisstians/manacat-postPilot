import { resolveProductImageSource as resolveProductImageSourceBase } from "../shared/productImage";

export const resolveProductImageSource = (imagePath: string): string =>
  resolveProductImageSourceBase(imagePath, window.manacatApi?.toFileUrl);
