import { describe, expect, it } from "vitest";
import { defaultTemplate } from "../shared/defaults.js";
import {
  M2_ICON_OFFSET_Y,
  M2_UNIT_VISUAL_CENTER_RATIO,
  PRICE_UNIT_GAP,
  UNIT_ICON_GAP,
  createEstimateTextMeasurer,
  fitSingleLineText,
  layoutM2IconY,
  layoutPriceRow,
  layoutBottomRows,
  layoutSizeRow,
  resolveBottomRowFontSize,
  BOTTOM_ROWS_GAP,
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
      (lastSegment ? measure({ text: lastSegment.text, fontSize: lastSegment.fontSize, fontFamily: "Garet", fontWeight: 700 }).width : 0);

    expect(layout.feature?.icon.x).toBe(sizeEnd + BOTTOM_ROWS_GAP);
  });
});
