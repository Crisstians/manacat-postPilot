import { Group, Image, Text } from "react-konva";
import { useLayoutEffect, useMemo, useState } from "react";
import m2UnitateIcon from "../../../assets/unitati/m2Unitate.png";
import {
  M2_ICON_NATIVE_SIZE,
  PRICE_UNIT_GAP,
  UNIT_ICON_GAP,
  createCanvasTextMeasurer,
  createEstimateTextMeasurer,
  layoutM2IconY,
  layoutPriceRow,
} from "../../../services/layoutEngine";
import type { TextBlock } from "../../../shared/types";
import { GARET_FONT, TEXT_GLOW, konvaFontStyle } from "./textStyles";
import { measureKonvaTextWidth, preloadGaretFonts } from "./measureKonvaText";
import { useKonvaImage } from "./useKonvaImage";

interface PriceRowProps {
  priceText: string;
  unitLabel: string;
  showM2Icon: boolean;
  priceBlock: TextBlock;
  unitBlock: TextBlock;
}

interface MeasuredRowLayout {
  unitX: number;
  iconX: number;
  iconY: number;
  iconWidth: number;
  iconHeight: number;
}

export function PriceRow({ priceText, unitLabel, showM2Icon, priceBlock, unitBlock }: PriceRowProps) {
  const measure = useMemo(
    () => createCanvasTextMeasurer() ?? createEstimateTextMeasurer(),
    [],
  );
  const iconImage = useKonvaImage(showM2Icon ? m2UnitateIcon : undefined);

  const layout = useMemo(
    () => layoutPriceRow(priceText, unitLabel, showM2Icon, priceBlock, unitBlock, measure),
    [priceText, unitLabel, showM2Icon, priceBlock, unitBlock, measure],
  );

  const [measuredLayout, setMeasuredLayout] = useState<MeasuredRowLayout | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;

    const measureRow = async () => {
      await preloadGaretFonts([layout.price.fontSize, layout.unit.fontSize]);
      if (cancelled) {
        return;
      }

      const priceWidth = measureKonvaTextWidth({
        text: priceText,
        fontSize: layout.price.fontSize,
        fontStyle: konvaFontStyle(priceBlock),
      });
      const unitWidth = measureKonvaTextWidth({
        text: unitLabel,
        fontSize: layout.unit.fontSize,
        fontStyle: konvaFontStyle(unitBlock),
      });

      const unitX = priceBlock.x + priceWidth + PRICE_UNIT_GAP;
      const iconHeight = Math.round(layout.unit.fontSize * 0.98);
      const iconWidth = Math.round((M2_ICON_NATIVE_SIZE.width / M2_ICON_NATIVE_SIZE.height) * iconHeight);

      setMeasuredLayout({
        unitX,
        iconX: unitX + unitWidth + UNIT_ICON_GAP,
        iconY: layoutM2IconY(unitBlock.y, layout.unit.fontSize, iconHeight),
        iconWidth,
        iconHeight,
      });
    };

    void measureRow();
    return () => {
      cancelled = true;
    };
  }, [
    priceText,
    unitLabel,
    showM2Icon,
    priceBlock,
    unitBlock,
    layout.price.fontSize,
    layout.unit.fontSize,
  ]);

  const unitX = measuredLayout?.unitX ?? layout.unit.x;
  const iconX = measuredLayout?.iconX ?? layout.icon?.x ?? 0;
  const iconY = measuredLayout?.iconY ?? layout.icon?.y ?? 0;
  const iconWidth = measuredLayout?.iconWidth ?? layout.icon?.width ?? 0;
  const iconHeight = measuredLayout?.iconHeight ?? layout.icon?.height ?? 0;

  return (
    <Group>
      <Text
        x={layout.price.x}
        y={layout.price.y}
        text={layout.price.text}
        fontSize={layout.price.fontSize}
        fontFamily={GARET_FONT}
        fontStyle={konvaFontStyle(priceBlock)}
        fill={priceBlock.fill}
        lineHeight={priceBlock.lineHeight}
        {...TEXT_GLOW}
      />
      <Text
        x={unitX}
        y={layout.unit.y}
        text={layout.unit.text}
        fontSize={layout.unit.fontSize}
        fontFamily={GARET_FONT}
        fontStyle={konvaFontStyle(unitBlock)}
        fill={unitBlock.fill}
        lineHeight={unitBlock.lineHeight}
        opacity={measuredLayout ? 1 : 0}
        {...TEXT_GLOW}
      />
      {showM2Icon && iconImage && measuredLayout ? (
        <Image
          image={iconImage}
          x={iconX}
          y={iconY}
          width={iconWidth}
          height={iconHeight}
          shadowColor="#000000"
          shadowBlur={12}
          shadowOpacity={0.85}
        />
      ) : null}
    </Group>
  );
}
