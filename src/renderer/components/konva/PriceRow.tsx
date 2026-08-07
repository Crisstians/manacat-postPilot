import Konva from "konva";
import { Group, Image, Rect, Text } from "react-konva";
import { useLayoutEffect, useMemo, useState } from "react";
import m2UnitateIcon from "../../../assets/unitati/m2Unitate.png";
import pretRedusBadge from "../../../assets/poze/pretRedus.png";
import pretRedusLinie from "../../../assets/poze/pretRedusLinie.png";
import produsNouBadge from "../../../assets/poze/produsNou.png";
import {
  HANGING_BADGE_GAP,
  M2_ICON_NATIVE_SIZE,
  PRICE_UNIT_GAP,
  UNIT_ICON_GAP,
  createCanvasTextMeasurer,
  createEstimateTextMeasurer,
  layoutDiscountPriceBlock,
  layoutHangingBadgeSize,
  layoutM2IconY,
  layoutPriceRow,
  resolveTextBlockHeight,
  type DiscountPriceBlockLayout,
  type PriceRowLayout,
} from "../../../services/layoutEngine";
import {
  applyDiscountLayoutOverrides,
  loadCommittedDiscountLayoutOverrides,
} from "../../../shared/discountLayoutOverrides";
import type { TextBlock } from "../../../shared/types";
import { GARET_FONT, TEXT_GLOW, konvaFontStyle } from "./textStyles";
import { measureKonvaTextWidth, preloadGaretFonts } from "./measureKonvaText";
import { useKonvaImage } from "./useKonvaImage";

const HOVER_STROKE = "rgba(251, 146, 60, 0.85)";
const SELECT_STROKE = "#fb923c";

interface PriceRowProps {
  priceText: string;
  originalPriceText?: string;
  hasDiscount?: boolean;
  hasNewProduct?: boolean;
  unitLabel: string;
  showM2Icon: boolean;
  priceBlock: TextBlock;
  unitBlock: TextBlock;
  /** Permite selectare + editare inline pe cifra de preț (nu pe lei/um). */
  interactive?: boolean;
  selected?: boolean;
  editing?: boolean;
  onSelect?: () => void;
  onEditRequest?: () => void;
}

interface MeasuredRowLayout {
  unitX: number;
  iconX: number;
  iconY: number;
  iconWidth: number;
  iconHeight: number;
}

interface MeasuredDiscountLayout {
  original: MeasuredRowLayout;
  sale: MeasuredRowLayout;
  strikeWidth: number;
}

const measurePriceUnitRow = async (
  priceText: string,
  unitLabel: string,
  price: PriceRowLayout["price"],
  unit: PriceRowLayout["unit"],
  priceBlock: TextBlock,
  unitBlock: TextBlock,
): Promise<MeasuredRowLayout> => {
  await preloadGaretFonts([price.fontSize, unit.fontSize]);

  const priceWidth = measureKonvaTextWidth({
    text: priceText,
    fontSize: price.fontSize,
    fontStyle: konvaFontStyle(priceBlock),
  });
  const unitWidth = measureKonvaTextWidth({
    text: unitLabel,
    fontSize: unit.fontSize,
    fontStyle: konvaFontStyle(unitBlock),
  });

  const unitX = price.x + priceWidth + PRICE_UNIT_GAP;
  const iconHeight = Math.round(unit.fontSize * 0.98);
  const iconWidth = Math.round((M2_ICON_NATIVE_SIZE.width / M2_ICON_NATIVE_SIZE.height) * iconHeight);

  return {
    unitX,
    iconX: unitX + unitWidth + UNIT_ICON_GAP,
    iconY: layoutM2IconY(unit.y, unit.fontSize, iconHeight),
    iconWidth,
    iconHeight,
  };
};

const stopDomBubble = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
  event.cancelBubble = true;
  event.evt.stopPropagation();
};

function PriceHitTarget({
  x,
  y,
  width,
  height,
  selected,
  editing,
  onSelect,
  onEditRequest,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onEditRequest: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const showHover = hovered && !selected && !editing;

  return (
    <Rect
      name="text-hit-price"
      x={x}
      y={y}
      width={Math.max(width, 40)}
      height={Math.max(height, 40)}
      fill={showHover ? "rgba(251, 146, 60, 0.06)" : "rgba(251, 146, 60, 0.001)"}
      stroke={editing ? undefined : selected ? SELECT_STROKE : showHover ? HOVER_STROKE : undefined}
      strokeWidth={selected || showHover ? 2 : 0}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
      listening={!editing}
      onMouseEnter={(event) => {
        setHovered(true);
        const stage = event.target.getStage();
        if (stage) stage.container().style.cursor = "pointer";
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        const stage = event.target.getStage();
        if (stage) stage.container().style.cursor = "default";
      }}
      onClick={(event) => {
        stopDomBubble(event);
        if (selected) {
          onEditRequest();
          return;
        }
        onSelect();
      }}
      onTap={(event) => {
        stopDomBubble(event);
        if (selected) {
          onEditRequest();
          return;
        }
        onSelect();
      }}
      onDblClick={(event) => {
        stopDomBubble(event);
        onSelect();
        onEditRequest();
      }}
      onDblTap={(event) => {
        stopDomBubble(event);
        onSelect();
        onEditRequest();
      }}
    />
  );
}

function PriceTexts({
  layout,
  measured,
  priceBlock,
  unitBlock,
  showM2Icon,
  iconImage,
  hidePrice = false,
}: {
  layout: PriceRowLayout;
  measured: MeasuredRowLayout | null;
  priceBlock: TextBlock;
  unitBlock: TextBlock;
  showM2Icon: boolean;
  iconImage: HTMLImageElement | null | undefined;
  hidePrice?: boolean;
}) {
  const unitX = measured?.unitX ?? layout.unit.x;
  const iconX = measured?.iconX ?? layout.icon?.x ?? 0;
  const iconY = measured?.iconY ?? layout.icon?.y ?? 0;
  const iconWidth = measured?.iconWidth ?? layout.icon?.width ?? 0;
  const iconHeight = measured?.iconHeight ?? layout.icon?.height ?? 0;

  return (
    <Group>
      {hidePrice ? null : (
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
      )}
      <Text
        x={unitX}
        y={layout.unit.y}
        text={layout.unit.text}
        fontSize={layout.unit.fontSize}
        fontFamily={GARET_FONT}
        fontStyle={konvaFontStyle(unitBlock)}
        fill={unitBlock.fill}
        lineHeight={unitBlock.lineHeight}
        opacity={measured ? 1 : 0}
        {...TEXT_GLOW}
      />
      {showM2Icon && iconImage && measured ? (
        <Image
          image={iconImage}
          x={iconX}
          y={iconY}
          width={iconWidth}
          height={iconHeight}
          imageSmoothingEnabled
          shadowColor="#000000"
          shadowBlur={12}
          shadowOpacity={0.85}
        />
      ) : null}
    </Group>
  );
}

export function PriceRow({
  priceText,
  originalPriceText,
  hasDiscount = false,
  hasNewProduct = false,
  unitLabel,
  showM2Icon,
  priceBlock,
  unitBlock,
  interactive = false,
  selected = false,
  editing = false,
  onSelect,
  onEditRequest,
}: PriceRowProps) {
  const measure = useMemo(
    () => createCanvasTextMeasurer() ?? createEstimateTextMeasurer(),
    [],
  );
  const iconImage = useKonvaImage(showM2Icon ? m2UnitateIcon : undefined);
  const discountBadgeImage = useKonvaImage(hasDiscount ? pretRedusBadge : undefined);
  const newProductBadgeImage = useKonvaImage(hasNewProduct ? produsNouBadge : undefined);
  const strikeImage = useKonvaImage(hasDiscount ? pretRedusLinie : undefined);

  const committedOverrides = useMemo(() => loadCommittedDiscountLayoutOverrides(), []);

  const saleLayout = useMemo(
    () => layoutPriceRow(priceText, unitLabel, showM2Icon, priceBlock, unitBlock, measure),
    [priceText, unitLabel, showM2Icon, priceBlock, unitBlock, measure],
  );

  const discountLayout = useMemo((): DiscountPriceBlockLayout | null => {
    if (!hasDiscount || !originalPriceText) return null;
    const base = layoutDiscountPriceBlock(
      priceText,
      originalPriceText,
      unitLabel,
      showM2Icon,
      priceBlock,
      unitBlock,
      measure,
    );
    return applyDiscountLayoutOverrides(base, committedOverrides);
  }, [
    hasDiscount,
    originalPriceText,
    priceText,
    unitLabel,
    showM2Icon,
    priceBlock,
    unitBlock,
    measure,
    committedOverrides,
  ]);

  const badgeSize = useMemo(() => layoutHangingBadgeSize(priceBlock), [priceBlock]);

  const discountBadgePos = useMemo(() => {
    if (discountLayout) {
      return {
        x: discountLayout.badge.x,
        y: discountLayout.badge.y,
        width: discountLayout.badge.width,
        height: discountLayout.badge.height,
      };
    }
    const fallback = committedOverrides.badge ?? {
      x: priceBlock.x,
      y: Math.max(0, priceBlock.y - 450),
    };
    return { ...fallback, ...badgeSize };
  }, [discountLayout, committedOverrides.badge, badgeSize, priceBlock.x, priceBlock.y]);

  const newProductBadgePos = useMemo(() => {
    if (hasDiscount) {
      if (committedOverrides.newProductBadge) {
        return { ...committedOverrides.newProductBadge, ...badgeSize };
      }
      return {
        x: discountBadgePos.x + discountBadgePos.width + HANGING_BADGE_GAP,
        y: discountBadgePos.y,
        ...badgeSize,
      };
    }
    return {
      x: discountBadgePos.x,
      y: discountBadgePos.y,
      ...badgeSize,
    };
  }, [committedOverrides.newProductBadge, hasDiscount, discountBadgePos, badgeSize]);

  const [measuredSale, setMeasuredSale] = useState<MeasuredRowLayout | null>(null);
  const [measuredDiscount, setMeasuredDiscount] = useState<MeasuredDiscountLayout | null>(null);

  useLayoutEffect(() => {
    if (discountLayout) {
      return;
    }

    let cancelled = false;
    void measurePriceUnitRow(
      priceText,
      unitLabel,
      saleLayout.price,
      saleLayout.unit,
      priceBlock,
      unitBlock,
    ).then((next) => {
      if (!cancelled) setMeasuredSale(next);
    });

    return () => {
      cancelled = true;
    };
  }, [
    discountLayout,
    priceText,
    unitLabel,
    saleLayout.price,
    saleLayout.unit,
    priceBlock,
    unitBlock,
  ]);

  useLayoutEffect(() => {
    if (!discountLayout || !originalPriceText) {
      setMeasuredDiscount(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const [original, sale] = await Promise.all([
        measurePriceUnitRow(
          originalPriceText,
          unitLabel,
          discountLayout.original.price,
          discountLayout.original.unit,
          priceBlock,
          unitBlock,
        ),
        measurePriceUnitRow(
          priceText,
          unitLabel,
          discountLayout.sale.price,
          discountLayout.sale.unit,
          priceBlock,
          unitBlock,
        ),
      ]);

      if (cancelled) return;

      const originalPriceWidth = measureKonvaTextWidth({
        text: originalPriceText,
        fontSize: discountLayout.original.price.fontSize,
        fontStyle: konvaFontStyle(priceBlock),
      });

      setMeasuredDiscount({
        original,
        sale,
        strikeWidth: Math.max(originalPriceWidth * 1.08, discountLayout.strike.width),
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [discountLayout, originalPriceText, priceText, unitLabel, priceBlock, unitBlock]);

  const badges = (
    <>
      {hasDiscount && discountBadgeImage ? (
        <Image
          image={discountBadgeImage}
          x={discountBadgePos.x}
          y={discountBadgePos.y}
          width={discountBadgePos.width}
          height={discountBadgePos.height}
          imageSmoothingEnabled
        />
      ) : null}
      {hasNewProduct && newProductBadgeImage ? (
        <Image
          image={newProductBadgeImage}
          x={newProductBadgePos.x}
          y={newProductBadgePos.y}
          width={newProductBadgePos.width}
          height={newProductBadgePos.height}
          imageSmoothingEnabled
        />
      ) : null}
    </>
  );

  const salePriceLayout = discountLayout?.sale ?? saleLayout;
  const salePriceWidth = Math.max(
    salePriceLayout.price.width,
    measuredDiscount?.sale
      ? measuredDiscount.sale.unitX - salePriceLayout.price.x - PRICE_UNIT_GAP
      : measuredSale
        ? measuredSale.unitX - saleLayout.price.x - PRICE_UNIT_GAP
        : salePriceLayout.price.width,
    80,
  );
  const salePriceHeight = resolveTextBlockHeight(priceBlock);

  const priceHit =
    interactive && onSelect && onEditRequest ? (
      <PriceHitTarget
        x={salePriceLayout.price.x}
        y={salePriceLayout.price.y}
        width={salePriceWidth}
        height={salePriceHeight}
        selected={selected}
        editing={editing}
        onSelect={onSelect}
        onEditRequest={onEditRequest}
      />
    ) : null;

  if (discountLayout) {
    const strikeWidth = measuredDiscount?.strikeWidth ?? discountLayout.strike.width;

    return (
      <Group>
        {badges}
        <PriceTexts
          layout={discountLayout.original}
          measured={measuredDiscount?.original ?? null}
          priceBlock={priceBlock}
          unitBlock={unitBlock}
          showM2Icon={showM2Icon}
          iconImage={iconImage}
        />
        {strikeImage ? (
          <Image
            image={strikeImage}
            x={discountLayout.strike.x}
            y={discountLayout.strike.y}
            width={strikeWidth}
            height={discountLayout.strike.height}
            imageSmoothingEnabled
          />
        ) : null}
        <PriceTexts
          layout={discountLayout.sale}
          measured={measuredDiscount?.sale ?? null}
          priceBlock={priceBlock}
          unitBlock={unitBlock}
          showM2Icon={showM2Icon}
          iconImage={iconImage}
          hidePrice={editing}
        />
        {priceHit}
      </Group>
    );
  }

  return (
    <Group>
      {badges}
      <PriceTexts
        layout={saleLayout}
        measured={measuredSale}
        priceBlock={priceBlock}
        unitBlock={unitBlock}
        showM2Icon={showM2Icon}
        iconImage={iconImage}
        hidePrice={editing}
      />
      {priceHit}
    </Group>
  );
}
