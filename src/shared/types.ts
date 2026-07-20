export type ProductCategory =
  | "gresie"
  | "faianta"
  | "vopsea"
  | "parchet"
  | "adezivi"
  | "produs-general";

export interface ProductInput {
  productName: string;
  category: ProductCategory;
  /** Subtitlu pe graphic (linii separate cu Enter). */
  subtitle: string;
  /** Preț curent / după reducere. */
  price: number;
  /** Preț înainte de reducere (folosit doar când hasDiscount). */
  originalPrice: number;
  hasDiscount: boolean;
  /** Badge „Produs nou” pe graphic. */
  hasNewProduct: boolean;
  unit: string;
  features: string[];
  description: string;
  sizeWidth: string;
  sizeHeight: string;
  productImagePath: string;
  /** PNG fără fundal, generat local în preview. */
  productImageProcessedPath?: string;
  /** Poziție și dimensiune manuală a pozei produsului în preview (opțional). */
  productImageLayout?: LayerRect;
}

export interface LayerRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TextFitMode = "shrinkSingleLine" | "shrinkWrap";

export interface TextBlock {
  id: string;
  x: number;
  y: number;
  maxWidth: number;
  fontSize: number;
  lineHeight: number;
  fill: string;
  weight?: 400 | 500 | 600 | 700 | 800;
  fitMode?: TextFitMode;
  minFontSize?: number;
}

export interface TemplateLayout {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundImagePath: string;
  productLayer: LayerRect;
  textBlocks: {
    productName: TextBlock;
    subtitle: TextBlock;
    description: TextBlock;
    price: TextBlock;
    unit: TextBlock;
    size: TextBlock;
    feature: TextBlock;
  };
}

export interface ExportRequest {
  product: ProductInput;
  template: TemplateLayout;
  textOverlayPngBase64?: string;
  /** Folosit când imaginea activă este blob/data URL (ex. după remove background). */
  productImageBase64?: string;
}

export interface ExportResult {
  success: boolean;
  imagePath?: string;
  captionPath?: string;
  error?: string;
}

export interface RenderPostResult {
  success: boolean;
  /** @deprecated Prefer `imageBase64` — kept for compat. */
  pngBase64?: string;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
}

export interface PrepareImageResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
}

export interface ExportJob extends ExportRequest {
  caption: string;
  outputImagePath: string;
  outputCaptionPath: string;
  textOverlayPngBase64: string;
  templatesDir?: string;
}

export interface PostDraft {
  id: string;
  product: ProductInput;
  template: TemplateLayout;
  facebookCaption: string;
  facebookCaptionTouched: boolean;
}

export const MAX_BULK_POSTS = 10;

export interface TemplateAsset {
  id: string;
  name: string;
  path: string;
}

export type UpdateStatus =
  | { phase: "checking" }
  | { phase: "available"; version: string }
  | { phase: "not-available" }
  | { phase: "downloading"; percent: number }
  | { phase: "downloaded"; version: string }
  | { phase: "installing"; version: string }
  | { phase: "error"; message: string };
