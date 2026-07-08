export type ProductCategory = "gresie" | "faianta" | "vopsea" | "parchet" | "adezivi";

export interface ProductInput {
  productName: string;
  category: ProductCategory;
  price: number;
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

export interface ExportJob extends ExportRequest {
  caption: string;
  outputImagePath: string;
  outputCaptionPath: string;
  textOverlayPngBase64: string;
}

export interface TemplateAsset {
  id: string;
  name: string;
  path: string;
}
