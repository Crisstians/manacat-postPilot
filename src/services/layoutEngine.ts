import type { TextBlock } from "../shared/types.js";
import type { ParsedSizeLabel } from "../shared/sizeDisplay.js";
import { DIMENSION_ICON_NATIVE_SIZE, MATERIAL_ICON_NATIVE_SIZE } from "../shared/sizeDisplay.js";

export const GARET_FONT_FAMILY = "Garet, Inter, Arial, sans-serif";

export const PRICE_UNIT_GAP = 8;
/** Spațiu orizontal între „lei” și iconița m² (nu afectează Y). */
export const UNIT_ICON_GAP = 6;
export const ICON_TEXT_GAP = 8;
export const SIZE_TEXT_GAP = 5;
export const SIZE_SMALL_FONT_RATIO = 0.48;
export const BOTTOM_ROW_ICON_HEIGHT_RATIO = 0.92;
/** Spațiu orizontal între rândul de dimensiuni și cel de aspect. */
export const BOTTOM_ROWS_GAP = 24;
export const SECONDARY_TEXT_BASELINE_RATIO = 0.82;
export const M2_ICON_NATIVE_SIZE = { width: 33, height: 29 };
/** Raport față de fontSize pentru centrul vizual al textului „lei”. */
export const M2_UNIT_VISUAL_CENTER_RATIO = 0.58;
/** Ajustare fină verticală după centrare (valori mai mari = icon mai jos). */
export const M2_ICON_OFFSET_Y = 4;

export const unitTextBaselineY = (unitY: number, fontSize: number): number =>
  unitY + fontSize * M2_UNIT_VISUAL_CENTER_RATIO;

export const layoutM2IconY = (unitY: number, fontSize: number, iconHeight: number): number =>
  unitTextBaselineY(unitY, fontSize) - iconHeight / 2 + M2_ICON_OFFSET_Y;

export interface TextMeasureInput {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
}

export interface TextMeasureResult {
  width: number;
  height: number;
}

export type TextMeasurer = (input: TextMeasureInput) => TextMeasureResult;

export interface FitTextResult {
  fontSize: number;
  text: string;
  width: number;
  height: number;
}

export interface WrappedLine {
  text: string;
  fontSize: number;
  y: number;
  width: number;
}

export interface PriceRowLayout {
  price: { x: number; y: number; fontSize: number; text: string; width: number };
  unit: { x: number; y: number; fontSize: number; text: string; width: number };
  icon?: { x: number; y: number; width: number; height: number };
}

export interface SizeRowSegment {
  text: string;
  fontSize: number;
  x: number;
  y: number;
}

export interface SizeRowLayout {
  icon: { x: number; y: number; width: number; height: number };
  segments: SizeRowSegment[];
}

export interface IconTextRowLayout {
  icon: { x: number; y: number; width: number; height: number };
  text: { x: number; y: number; fontSize: number; text: string; width: number };
}

export interface BottomRowsLayout {
  fontSize: number;
  iconHeight: number;
  size: SizeRowLayout | null;
  feature: IconTextRowLayout | null;
}

export const defaultMinFontSize = (block: TextBlock): number =>
  block.minFontSize ?? Math.round(block.fontSize * 0.6);

export const blockFontWeight = (block: TextBlock): number => block.weight ?? 700;

export const estimateTextWidth = (text: string, fontSize: number): number =>
  [...text].reduce((width, character) => width + (character === " " ? fontSize * 0.28 : fontSize * 0.55), 0);

export const createEstimateTextMeasurer = (): TextMeasurer => ({ text, fontSize }) => ({
  width: estimateTextWidth(text, fontSize),
  height: fontSize,
});

export const createCanvasTextMeasurer = (): TextMeasurer | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  return ({ text, fontSize, fontFamily, fontWeight }) => {
    const cssWeight = fontWeight >= 700 ? 700 : fontWeight;
    context.font = `${cssWeight} ${fontSize}px ${fontFamily}`;
    const metrics = context.measureText(text);
    return {
      width: metrics.width,
      height: fontSize * 1.2,
    };
  };
};

export const fitSingleLineText = (
  text: string,
  block: TextBlock,
  measure: TextMeasurer = createEstimateTextMeasurer(),
): FitTextResult => {
  const minSize = defaultMinFontSize(block);
  const weight = blockFontWeight(block);

  if (!text) {
    return { fontSize: block.fontSize, text: "", width: 0, height: block.fontSize };
  }

  let low = minSize;
  let high = block.fontSize;
  let best = minSize;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const { width } = measure({
      text,
      fontSize: mid,
      fontFamily: GARET_FONT_FAMILY,
      fontWeight: weight,
    });

    if (width <= block.maxWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const measured = measure({
    text,
    fontSize: best,
    fontFamily: GARET_FONT_FAMILY,
    fontWeight: weight,
  });

  return {
    fontSize: best,
    text,
    width: measured.width,
    height: measured.height,
  };
};

export const wrapTextToLines = (
  text: string,
  fontSize: number,
  maxWidth: number,
  measure: TextMeasurer,
  weight: number,
): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const { width } = measure({
      text: candidate,
      fontSize,
      fontFamily: GARET_FONT_FAMILY,
      fontWeight: weight,
    });

    if (width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

export const fitWrappedText = (
  text: string,
  block: TextBlock,
  measure: TextMeasurer = createEstimateTextMeasurer(),
  maxHeight = block.fontSize * block.lineHeight * 5,
): { fontSize: number; lines: WrappedLine[] } => {
  const minSize = defaultMinFontSize(block);
  const weight = blockFontWeight(block);
  let bestSize = minSize;
  let bestLines = wrapTextToLines(text, minSize, block.maxWidth, measure, weight);

  for (let size = block.fontSize; size >= minSize; size -= 1) {
    const lines = wrapTextToLines(text, size, block.maxWidth, measure, weight);
    const totalHeight = lines.length * size * block.lineHeight;
    if (totalHeight <= maxHeight) {
      bestSize = size;
      bestLines = lines;
      break;
    }
  }

  const lineHeightPx = bestSize * block.lineHeight;
  const lines: WrappedLine[] = bestLines.map((line, index) => {
    const measured = measure({
      text: line,
      fontSize: bestSize,
      fontFamily: GARET_FONT_FAMILY,
      fontWeight: weight,
    });
    return {
      text: line,
      fontSize: bestSize,
      y: block.y + index * lineHeightPx,
      width: measured.width,
    };
  });

  return { fontSize: bestSize, lines };
};

export const layoutPriceRow = (
  priceText: string,
  unitLabel: string,
  showM2Icon: boolean,
  priceBlock: TextBlock,
  unitBlock: TextBlock,
  measure: TextMeasurer = createEstimateTextMeasurer(),
): PriceRowLayout => {
  const fittedPrice = fitSingleLineText(priceText, priceBlock, measure);
  const leiX = priceBlock.x + fittedPrice.width + PRICE_UNIT_GAP;
  const fittedUnit = fitSingleLineText(unitLabel, unitBlock, measure);

  const layout: PriceRowLayout = {
    price: {
      x: priceBlock.x,
      y: priceBlock.y,
      fontSize: fittedPrice.fontSize,
      text: priceText,
      width: fittedPrice.width,
    },
    unit: {
      x: leiX,
      y: unitBlock.y,
      fontSize: fittedUnit.fontSize,
      text: unitLabel,
      width: fittedUnit.width,
    },
  };

  if (showM2Icon) {
    const unitFontSize = fittedUnit.fontSize;
    const iconHeight = Math.round(unitFontSize * 0.98);
    const iconWidth = Math.round((M2_ICON_NATIVE_SIZE.width / M2_ICON_NATIVE_SIZE.height) * iconHeight);
    layout.icon = {
      x: leiX + fittedUnit.width + UNIT_ICON_GAP,
      y: layoutM2IconY(unitBlock.y, unitFontSize, iconHeight),
      width: iconWidth,
      height: iconHeight,
    };
  }

  return layout;
};

export const alignSecondaryTextY = (
  primaryY: number,
  primarySize: number,
  secondarySize: number,
): number => primaryY + primarySize * SECONDARY_TEXT_BASELINE_RATIO - secondarySize * SECONDARY_TEXT_BASELINE_RATIO;

const measureSegmentWidth = (
  text: string,
  fontSize: number,
  weight: number,
  measure: TextMeasurer,
): number =>
  measure({
    text,
    fontSize,
    fontFamily: GARET_FONT_FAMILY,
    fontWeight: weight,
  }).width;

const bottomRowIconHeight = (fontSize: number): number =>
  Math.round(fontSize * BOTTOM_ROW_ICON_HEIGHT_RATIO);

const layoutRowIconAt = (
  block: TextBlock,
  fontSize: number,
  iconHeight: number,
  nativeSize: { width: number; height: number },
): { x: number; y: number; width: number; height: number } => {
  const iconWidth = Math.round((nativeSize.width / nativeSize.height) * iconHeight);
  return {
    x: block.x,
    y: block.y + Math.round(fontSize * 0.5) - Math.round(iconHeight * 0.5),
    width: iconWidth,
    height: iconHeight,
  };
};

const estimateSizeRowContentWidth = (
  parsed: ParsedSizeLabel,
  fontSize: number,
  measure: TextMeasurer,
  weight: number,
): number => {
  const smallSize = Math.max(Math.round(fontSize * SIZE_SMALL_FONT_RATIO), Math.round(fontSize * 0.4));
  return (
    measureSegmentWidth(parsed.width, fontSize, weight, measure) +
    SIZE_TEXT_GAP +
    measureSegmentWidth("x", smallSize, weight, measure) +
    SIZE_TEXT_GAP +
    measureSegmentWidth(parsed.height, fontSize, weight, measure) +
    SIZE_TEXT_GAP +
    measureSegmentWidth(parsed.unit, smallSize, weight, measure)
  );
};

const sizeRowTotalWidth = (
  parsed: ParsedSizeLabel,
  block: TextBlock,
  fontSize: number,
  measure: TextMeasurer,
): number => {
  const iconHeight = bottomRowIconHeight(fontSize);
  const iconWidth = Math.round(
    (DIMENSION_ICON_NATIVE_SIZE.width / DIMENSION_ICON_NATIVE_SIZE.height) * iconHeight,
  );
  return iconWidth + ICON_TEXT_GAP + estimateSizeRowContentWidth(parsed, fontSize, measure, blockFontWeight(block));
};

const FEATURE_ROW_EDGE_MARGIN = 12;

/** Spațiu disponibil pentru aspect până la marginea conținutului (ex. imagine produs). */
export const effectiveFeatureMaxWidth = (
  featureBlock: TextBlock,
  contentRightEdge = 532,
): number =>
  Math.max(featureBlock.maxWidth, contentRightEdge - featureBlock.x - FEATURE_ROW_EDGE_MARGIN);

const featureRowTotalWidthAtIconHeight = (
  text: string,
  block: TextBlock,
  fontSize: number,
  iconHeight: number,
  measure: TextMeasurer,
): number => {
  const iconWidth = Math.round(
    (MATERIAL_ICON_NATIVE_SIZE.width / MATERIAL_ICON_NATIVE_SIZE.height) * iconHeight,
  );
  return iconWidth + ICON_TEXT_GAP + measureSegmentWidth(text, fontSize, blockFontWeight(block), measure);
};

export const resolveSizeRowFontSize = (
  sizeParsed: ParsedSizeLabel,
  sizeBlock: TextBlock,
  measure: TextMeasurer = createEstimateTextMeasurer(),
): number => {
  const maxSize = sizeBlock.fontSize;
  const minSize = Math.max(defaultMinFontSize(sizeBlock), 24);

  for (let size = maxSize; size >= minSize; size -= 1) {
    if (sizeRowTotalWidth(sizeParsed, sizeBlock, size, measure) <= sizeBlock.maxWidth) {
      return size;
    }
  }

  return minSize;
};

export const resolveFeatureRowFontSize = (
  featureText: string,
  featureBlock: TextBlock,
  preferredSize: number,
  iconHeight: number,
  measure: TextMeasurer = createEstimateTextMeasurer(),
  maxWidth?: number,
): number => {
  const feature = featureText.trim();
  if (!feature || feature === "-") {
    return preferredSize;
  }

  const effectiveMaxWidth = maxWidth ?? effectiveFeatureMaxWidth(featureBlock);
  const maxSize = Math.min(featureBlock.fontSize, preferredSize);
  const minSize = Math.max(defaultMinFontSize(featureBlock), 22);

  for (let size = maxSize; size >= minSize; size -= 1) {
    if (
      featureRowTotalWidthAtIconHeight(feature, featureBlock, size, iconHeight, measure) <= effectiveMaxWidth
    ) {
      return size;
    }
  }

  return minSize;
};

/** Font size de referință pentru rândul de dimensiuni (nu mai este limitat de aspect). */
export const resolveBottomRowFontSize = (
  sizeParsed: ParsedSizeLabel | null,
  _featureText: string,
  sizeBlock: TextBlock,
  _featureBlock: TextBlock,
  measure: TextMeasurer = createEstimateTextMeasurer(),
): number =>
  sizeParsed ? resolveSizeRowFontSize(sizeParsed, sizeBlock, measure) : sizeBlock.fontSize;

export const layoutSizeRowAt = (
  parsed: ParsedSizeLabel,
  block: TextBlock,
  fontSize: number,
  measure: TextMeasurer = createEstimateTextMeasurer(),
): SizeRowLayout => {
  const weight = blockFontWeight(block);
  const iconHeight = bottomRowIconHeight(fontSize);
  const icon = layoutRowIconAt(block, fontSize, iconHeight, DIMENSION_ICON_NATIVE_SIZE);
  const smallSize = Math.max(Math.round(fontSize * SIZE_SMALL_FONT_RATIO), Math.round(fontSize * 0.4));
  const mainY = block.y;
  const smallY = alignSecondaryTextY(block.y, fontSize, smallSize);

  let cursorX = icon.x + icon.width + ICON_TEXT_GAP;
  const segments: SizeRowSegment[] = [{ text: parsed.width, fontSize, x: cursorX, y: mainY }];
  cursorX += measureSegmentWidth(parsed.width, fontSize, weight, measure) + SIZE_TEXT_GAP;

  segments.push({ text: "x", fontSize: smallSize, x: cursorX, y: smallY });
  cursorX += measureSegmentWidth("x", smallSize, weight, measure) + SIZE_TEXT_GAP;

  segments.push({ text: parsed.height, fontSize, x: cursorX, y: mainY });
  cursorX += measureSegmentWidth(parsed.height, fontSize, weight, measure) + SIZE_TEXT_GAP;

  segments.push({ text: parsed.unit, fontSize: smallSize, x: cursorX, y: smallY });

  return { icon, segments };
};

const sizeRowRightEdge = (
  layout: SizeRowLayout,
  measure: TextMeasurer,
  weight: number,
): number => {
  const last = layout.segments.at(-1);
  if (!last) {
    return layout.icon.x + layout.icon.width;
  }
  return last.x + measureSegmentWidth(last.text, last.fontSize, weight, measure);
};

export const layoutIconTextRowAt = (
  text: string,
  block: TextBlock,
  fontSize: number,
  iconHeight: number,
  nativeIconSize: { width: number; height: number },
  measure: TextMeasurer = createEstimateTextMeasurer(),
): IconTextRowLayout => {
  const icon = layoutRowIconAt(block, fontSize, iconHeight, nativeIconSize);
  const fittedWidth = measureSegmentWidth(text, fontSize, blockFontWeight(block), measure);

  return {
    icon,
    text: {
      x: icon.x + icon.width + ICON_TEXT_GAP,
      y: block.y,
      fontSize,
      text,
      width: fittedWidth,
    },
  };
};

export const layoutBottomRows = (
  sizeParsed: ParsedSizeLabel | null,
  featureText: string,
  sizeBlock: TextBlock,
  featureBlock: TextBlock,
  measure: TextMeasurer = createEstimateTextMeasurer(),
): BottomRowsLayout => {
  const sizeFontSize = sizeParsed
    ? resolveSizeRowFontSize(sizeParsed, sizeBlock, measure)
    : sizeBlock.fontSize;
  const iconHeight = bottomRowIconHeight(sizeFontSize);
  const feature = featureText.trim() && featureText !== "-" ? featureText : "";
  const sizeLayout = sizeParsed ? layoutSizeRowAt(sizeParsed, sizeBlock, sizeFontSize, measure) : null;
  const featureBlockPositioned = sizeLayout
    ? {
        ...featureBlock,
        x: sizeRowRightEdge(sizeLayout, measure, blockFontWeight(sizeBlock)) + BOTTOM_ROWS_GAP,
      }
    : featureBlock;
  const featureFontSize = feature
    ? resolveFeatureRowFontSize(feature, featureBlockPositioned, sizeFontSize, iconHeight, measure)
    : sizeFontSize;

  return {
    fontSize: sizeFontSize,
    iconHeight,
    size: sizeLayout,
    feature: feature
      ? layoutIconTextRowAt(
          feature,
          featureBlockPositioned,
          featureFontSize,
          iconHeight,
          MATERIAL_ICON_NATIVE_SIZE,
          measure,
        )
      : null,
  };
};

export const layoutSizeRow = (
  parsed: ParsedSizeLabel,
  block: TextBlock,
  measure: TextMeasurer = createEstimateTextMeasurer(),
): SizeRowLayout => {
  const fontSize = resolveSizeRowFontSize(parsed, block, measure);
  return layoutSizeRowAt(parsed, block, fontSize, measure);
};

export const layoutIconTextRow = (
  text: string,
  block: TextBlock,
  nativeIconSize: { width: number; height: number },
  measure: TextMeasurer = createEstimateTextMeasurer(),
): IconTextRowLayout => {
  const iconHeight = bottomRowIconHeight(block.fontSize);
  const fontSize = resolveFeatureRowFontSize(text, block, block.fontSize, iconHeight, measure);
  return layoutIconTextRowAt(text, block, fontSize, iconHeight, nativeIconSize, measure);
};

export const layoutFeatureRow = (
  text: string,
  block: TextBlock,
  measure: TextMeasurer = createEstimateTextMeasurer(),
): IconTextRowLayout =>
  layoutIconTextRow(text, block, MATERIAL_ICON_NATIVE_SIZE, measure);
