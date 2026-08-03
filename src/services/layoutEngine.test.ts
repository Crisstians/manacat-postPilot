import { describe, expect, it } from "vitest";
import { defaultTemplate } from "../shared/defaults.js";
import {
  M2_ICON_OFFSET_Y,
  M2_UNIT_VISUAL_CENTER_RATIO,
  PRICE_UNIT_GAP,
  UNIT_ICON_GAP,
  createEstimateTextMeasurer,
  fitSingleLineText,
  fitTextToBox,
  layoutM2IconY,
  layoutPriceRow,
  layoutDiscountPriceBlock,
  layoutBottomRows,
  layoutSizeRow,
  resolveBottomRowFontSize,
  BOTTOM_ROWS_GAP,
  DISCOUNT_BADGE_TO_PRICE_GAP,
  ORIGINAL_PRICE_FONT_RATIO,
} from "./layoutEngine.js";

describe("layoutEngine", () => {
  const measure = createEstimateTextMeasurer();
  const linearMeasure = (input: { text: string; fontSize: number }) => ({
    width: input.text.length * input.fontSize * 0.5,
    height: input.fontSize,
  });

  it("shrinks long single-line text instead of wrapping", () => {
    const block = { ...defaultTemplate.textBlocks.productName, maxWidth: 400, minFontSize: 20 };
    const longName = "Placă ceramică premium lungă";
    const fitted = fitSingleLineText(longName, block, linearMeasure);

    expect(fitted.fontSize).toBeLessThan(block.fontSize);
    expect(fitted.width).toBeLessThanOrEqual(block.maxWidth);
  });

  it("keeps original font size when text fits", () => {
    const block = { ...defaultTemplate.textBlocks.price };
    const fitted = fitSingleLineText("49.99", block, measure);

    expect(fitted.fontSize).toBe(block.fontSize);
    expect(fitted.text).toBe("49.99");
  });

  it("wraps by width and keeps font size when height fits", () => {
    const block = {
      ...defaultTemplate.textBlocks.description,
      maxWidth: 400,
      height: 400,
      fontSize: 40,
      minFontSize: 20,
    };
    const fitted = fitTextToBox("Lorem ipsum dolor sit amet consectetur", block, linearMeasure);

    expect(fitted.fontSize).toBe(block.fontSize);
    expect(fitted.lines.length).toBeGreaterThan(1);
    expect(fitted.lines.every((line) => line.width <= block.maxWidth + 1)).toBe(true);
  });

  it("shrinks font only when wrapped text exceeds box height", () => {
    const block = {
      ...defaultTemplate.textBlocks.description,
      maxWidth: 200,
      height: 60,
      fontSize: 40,
      lineHeight: 1,
      minFontSize: 12,
    };
    const fitted = fitTextToBox(
      "Text foarte lung care trebuie să încapă în cutia mică pe înălțime",
      block,
      linearMeasure,
    );

    expect(fitted.fontSize).toBeLessThan(block.fontSize);
    expect(fitted.lines.length * fitted.fontSize * block.lineHeight).toBeLessThanOrEqual(
      block.height + 1,
    );
  });

  it("preserves explicit newlines when wrapping to box", () => {
    const block = {
      ...defaultTemplate.textBlocks.subtitle,
      maxWidth: 2000,
      height: 400,
      fontSize: 40,
    };
    const fitted = fitTextToBox("Linia unu\nLinia doi", block, linearMeasure);

    expect(fitted.fontSize).toBe(block.fontSize);
    expect(fitted.lines.map((line) => line.text)).toEqual(["Linia unu", "Linia doi"]);
  });

  it("places m2 icon immediately after lei with dynamic spacing", () => {
    const priceBlock = { ...defaultTemplate.textBlocks.price };
    const unitBlock = { ...defaultTemplate.textBlocks.unit };
    const layout = layoutPriceRow("49.99", "lei", true, priceBlock, unitBlock, measure);

    expect(layout.unit.x).toBe(layout.price.x + layout.price.width + PRICE_UNIT_GAP);
    expect(layout.icon).toBeDefined();
    expect(layout.icon?.x).toBe(layout.unit.x + layout.unit.width + UNIT_ICON_GAP);
    expect(layout.icon?.y).toBe(
      layoutM2IconY(unitBlock.y, layout.unit.fontSize, layout.icon?.height ?? 0),
    );
  });

  it("uses separate constants for horizontal gap and vertical offset", () => {
    const priceBlock = { ...defaultTemplate.textBlocks.price };
    const unitBlock = { ...defaultTemplate.textBlocks.unit };
    const layout = layoutPriceRow("49.99", "lei", true, priceBlock, unitBlock, measure);

    expect(layout.icon).toBeDefined();
    expect(layout.icon?.x).toBe(layout.unit.x + layout.unit.width + UNIT_ICON_GAP);
    expect(layout.icon?.y).toBe(
      layoutM2IconY(unitBlock.y, layout.unit.fontSize, layout.icon?.height ?? 0),
    );
  });

  it("centers m2 icon vertically against lei visual center", () => {
    const unitBlock = { ...defaultTemplate.textBlocks.unit };
    const iconHeight = 163;
    const iconY = layoutM2IconY(unitBlock.y, unitBlock.fontSize, iconHeight);
    const visualCenter = unitBlock.y + unitBlock.fontSize * M2_UNIT_VISUAL_CENTER_RATIO;

    expect(iconY + iconHeight / 2 - M2_ICON_OFFSET_Y).toBeCloseTo(visualCenter, 5);
  });

  it("omits m2 icon for non-square-meter units", () => {
    const priceBlock = { ...defaultTemplate.textBlocks.price };
    const unitBlock = { ...defaultTemplate.textBlocks.unit };
    const layout = layoutPriceRow("49.99", "lei/L", false, priceBlock, unitBlock, measure);

    expect(layout.icon).toBeUndefined();
    expect(layout.unit.text).toBe("lei/L");
  });

  it("lays out discount badge, original price above sale, and strike over original", () => {
    const priceBlock = { ...defaultTemplate.textBlocks.price };
    const unitBlock = { ...defaultTemplate.textBlocks.unit };
    const layout = layoutDiscountPriceBlock(
      "49.99",
      "69.99",
      "lei",
      true,
      priceBlock,
      unitBlock,
      measure,
    );

    expect(layout.badge.x).toBe(priceBlock.x);
    expect(layout.original.price.x).toBe(
      priceBlock.x + layout.badge.width + DISCOUNT_BADGE_TO_PRICE_GAP,
    );
    expect(layout.sale.price.x).toBe(layout.original.price.x);
    expect(layout.sale.price.y).toBe(priceBlock.y);
    expect(layout.original.price.y).toBeLessThan(layout.sale.price.y);
    expect(layout.badge.y).toBeLessThan(layout.sale.price.y);
    expect(layout.original.price.fontSize).toBe(
      Math.round(priceBlock.fontSize * ORIGINAL_PRICE_FONT_RATIO),
    );
    expect(layout.sale.price.fontSize).toBe(priceBlock.fontSize);
    expect(layout.strike.x).toBeLessThanOrEqual(layout.original.price.x);
    expect(layout.strike.width).toBeGreaterThan(layout.original.price.width * 0.9);
    expect(layout.original.icon).toBeDefined();
    expect(layout.sale.icon).toBeDefined();
  });

  it("lays out size row with smaller x and unit text", () => {
    const sizeBlock = { ...defaultTemplate.textBlocks.size };
    const layout = layoutSizeRow({ width: "60", height: "120", unit: "cm" }, sizeBlock, measure);

    expect(layout.segments).toHaveLength(4);
    expect(layout.segments[0]?.text).toBe("60");
    expect(layout.segments[1]?.text).toBe("x");
    expect(layout.segments[2]?.text).toBe("120");
    expect(layout.segments[3]?.text).toBe("cm");
    expect(layout.segments[1]?.fontSize ?? 0).toBeLessThan(layout.segments[0]?.fontSize ?? 0);
    expect(layout.segments[3]?.fontSize ?? 0).toBeLessThan(layout.segments[2]?.fontSize ?? 0);
    expect(layout.segments[1]?.y).toBeGreaterThan(layout.segments[0]?.y ?? 0);
  });

  it("keeps size row font independent from feature text length", () => {
    const sizeBlock = { ...defaultTemplate.textBlocks.size };
    const featureBlock = { ...defaultTemplate.textBlocks.feature };
    const parsed = { width: "60", height: "120", unit: "cm" };
    const shortLayout = layoutBottomRows(parsed, "Matt", sizeBlock, featureBlock, measure);
    const longLayout = layoutBottomRows(parsed, "Cu efect 3D", sizeBlock, featureBlock, measure);

    expect(shortLayout.size?.segments[0]?.fontSize).toBe(sizeBlock.fontSize);
    expect(longLayout.size?.segments[0]?.fontSize).toBe(sizeBlock.fontSize);
    expect(shortLayout.size?.icon.height).toBe(longLayout.iconHeight);
    expect(longLayout.feature?.icon.height).toBe(longLayout.iconHeight);
    expect(resolveBottomRowFontSize(parsed, "Cu efect 3D", sizeBlock, featureBlock, measure)).toBe(
      longLayout.fontSize,
    );
  });

  it("positions feature row after size row with a gap", () => {
    const sizeBlock = { ...defaultTemplate.textBlocks.size };
    const featureBlock = { ...defaultTemplate.textBlocks.feature };
    const parsed = { width: "50", height: "120", unit: "cm" };
    const layout = layoutBottomRows(parsed, "Argintiu lucios", sizeBlock, featureBlock, measure);
    const lastSegment = layout.size?.segments.at(-1);
    const sizeEnd =
      (lastSegment?.x ?? 0) +
      (lastSegment
        ? measure({
            text: lastSegment.text,
            fontSize: lastSegment.fontSize,
            fontFamily: "Garet",
            fontWeight: 700,
          }).width
        : 0);

    expect(layout.feature?.icon.x).toBe(sizeEnd + BOTTOM_ROWS_GAP);
  });

  it("anchors feature row at size position when requested and size is missing", () => {
    const sizeBlock = { ...defaultTemplate.textBlocks.size };
    const featureBlock = { ...defaultTemplate.textBlocks.feature };
    const layout = layoutBottomRows(null, "Lavabilă", sizeBlock, featureBlock, measure, {
      anchorFeatureAtSize: true,
    });

    expect(layout.size).toBeNull();
    expect(layout.feature?.icon.x).toBe(sizeBlock.x);
    expect(layout.feature?.icon.y).toBeGreaterThanOrEqual(sizeBlock.y - 2);
  });
});
