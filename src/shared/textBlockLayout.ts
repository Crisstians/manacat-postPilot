import type { TemplateLayout, TextBlock, TextBlockGeometry } from "./types";

/** Linii implicite când lipsește `height` pe draft-uri vechi. */
export const TEXT_BLOCK_FALLBACK_LINES: Record<keyof TemplateLayout["textBlocks"], number> = {
  productName: 2,
  subtitle: 2,
  description: 5,
  price: 1,
  unit: 1,
  size: 1,
  feature: 1,
};

export const defaultTextBlockHeight = (block: Pick<TextBlock, "fontSize" | "lineHeight">, lines = 1): number =>
  Math.round(block.fontSize * block.lineHeight * lines);

export const normalizeTextBlock = (block: TextBlock, fallbackLines = 1): TextBlock => {
  const height =
    typeof block.height === "number" && Number.isFinite(block.height) && block.height > 0
      ? block.height
      : defaultTextBlockHeight(block, fallbackLines);

  return {
    ...block,
    height,
    fitMode: block.fitMode ?? "boxFit",
  };
};

export const normalizeTemplateTextBlocks = (
  textBlocks: TemplateLayout["textBlocks"],
): TemplateLayout["textBlocks"] => ({
  productName: normalizeTextBlock(textBlocks.productName, TEXT_BLOCK_FALLBACK_LINES.productName),
  subtitle: normalizeTextBlock(textBlocks.subtitle, TEXT_BLOCK_FALLBACK_LINES.subtitle),
  description: normalizeTextBlock(textBlocks.description, TEXT_BLOCK_FALLBACK_LINES.description),
  price: normalizeTextBlock(textBlocks.price, TEXT_BLOCK_FALLBACK_LINES.price),
  unit: normalizeTextBlock(textBlocks.unit, TEXT_BLOCK_FALLBACK_LINES.unit),
  size: normalizeTextBlock(textBlocks.size, TEXT_BLOCK_FALLBACK_LINES.size),
  feature: normalizeTextBlock(textBlocks.feature, TEXT_BLOCK_FALLBACK_LINES.feature),
});

export const normalizeTemplateLayout = (template: TemplateLayout): TemplateLayout => ({
  ...template,
  textBlocks: normalizeTemplateTextBlocks(template.textBlocks),
});

export const applyTextBlockGeometry = (
  block: TextBlock,
  geometry: TextBlockGeometry,
): TextBlock => ({
  ...block,
  x: geometry.x,
  y: geometry.y,
  maxWidth: geometry.maxWidth,
  height: geometry.height,
});
