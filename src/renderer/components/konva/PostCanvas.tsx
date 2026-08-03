import Konva from "konva";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Image, Layer, Rect, Stage } from "react-konva";
import {
  resolveProductImageRect,
} from "../../../services/layout";
import { categoryShowsProductPlate, categoryUsesSize } from "../../../shared/categoryLayout";
import { getDisplayProductImagePath } from "../../../shared/productImage";
import { resolveProductImageSource } from "../../productImageSource";
import { resolveTemplateImageSource } from "../../templateImageSource";
import type {
  LayerRect,
  ProductInput,
  TemplateLayout,
  TemplateTextBlockId,
  TextBlockGeometry,
} from "../../../shared/types";
import { defaultSubtitleForCategory } from "../../../shared/productSubtitle";
import { isSquareMeterUnit, unitPriceSuffixText } from "../../../shared/unitDisplay";
import { BottomRows } from "./BottomRows";
import { EditableTextBlock } from "./EditableTextBlock";
import { PriceRow } from "./PriceRow";
import { ProductImageLayer } from "./ProductImageLayer";
import { EXPORT_PIXEL_RATIO } from "./textStyles";
import { useKonvaImage, useKonvaImageFromSrc } from "./useKonvaImage";

export interface PostCanvasHandle {
  exportTextOverlay: () => Promise<string | null>;
  exportFullImage: () => Promise<string | null>;
}

interface PostCanvasProps {
  product: ProductInput;
  template: TemplateLayout;
  showProductPlaceholder?: boolean;
  previewScale?: number;
  onProductImageLayoutChange?: (layout: LayerRect) => void;
  onTextBlockLayoutChange?: (blockId: TemplateTextBlockId, geometry: TextBlockGeometry) => void;
}

type CanvasSelection =
  | { type: "product" }
  | { type: "text"; id: TemplateTextBlockId }
  | null;

const getPreviewPixelRatio = (): number => {
  if (typeof window === "undefined") {
    return 1;
  }
  return Math.min(window.devicePixelRatio || 1, 2);
};

const applyPreviewStageSizing = (
  stage: Konva.Stage,
  template: { width: number; height: number },
  previewScale: number,
) => {
  stage.scale({ x: previewScale, y: previewScale });
  stage.size({
    width: template.width * previewScale,
    height: template.height * previewScale,
  });
  stage.getLayers().forEach((layer) => {
    layer.getCanvas().setPixelRatio(getPreviewPixelRatio());
  });
};

const applyExportStageSizing = (
  stage: Konva.Stage,
  template: { width: number; height: number },
) => {
  stage.scale({ x: 1, y: 1 });
  stage.size({ width: template.width, height: template.height });
  stage.getLayers().forEach((layer) => {
    layer.getCanvas().setPixelRatio(EXPORT_PIXEL_RATIO);
  });
};

const resolveImageSrc = (path: string): string => resolveProductImageSource(path);

const resolveBackgroundSrc = (path: string): string => resolveTemplateImageSource(path);

const isInteractiveCanvasTarget = (target: Konva.Node): boolean => {
  const name = target.name() ?? "";
  if (name === "product-image" || name.startsWith("text-block-") || name.startsWith("text-hit-")) {
    return true;
  }

  let parent = target.getParent();
  while (parent) {
    if (parent.className === "Transformer") {
      return true;
    }
    const parentName = parent.name() ?? "";
    if (parentName === "product-image" || parentName.startsWith("text-block-")) {
      return true;
    }
    parent = parent.getParent();
  }

  return false;
};

export const PostCanvas = forwardRef<PostCanvasHandle, PostCanvasProps>(function PostCanvas(
  {
    product,
    template,
    showProductPlaceholder = true,
    previewScale = 1,
    onProductImageLayoutChange,
    onTextBlockLayoutChange,
  },
  ref,
) {
  const textLayerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [selection, setSelection] = useState<CanvasSelection>(null);
  const backgroundSrc = template.backgroundImagePath
    ? resolveBackgroundSrc(template.backgroundImagePath)
    : undefined;
  const productSrc = product.productImagePath
    ? resolveImageSrc(getDisplayProductImagePath(product))
    : undefined;
  const backgroundImage = useKonvaImageFromSrc(backgroundSrc);
  const productImage = useKonvaImage(productSrc);
  const interactiveProductImage = Boolean(productImage && onProductImageLayoutChange);
  const interactiveText = Boolean(onTextBlockLayoutChange);

  const productRect = useMemo(() => {
    if (!productImage) {
      return template.productLayer;
    }

    return resolveProductImageRect(
      productImage.width,
      productImage.height,
      template.productLayer,
      product.productImageLayout,
    );
  }, [product.productImageLayout, productImage, template.productLayer]);

  useEffect(() => {
    setSelection(null);
  }, [product.productImagePath]);

  const subtitleText =
    product.subtitle.trim() || defaultSubtitleForCategory(product.category);
  const featureText = product.features[0] ?? "-";
  const showSize = categoryUsesSize(product.category);
  const showProductPlate = categoryShowsProductPlate(product.category);
  const priceText = Number.isFinite(product.price) ? product.price.toFixed(2) : "0.00";
  const originalPriceText =
    product.hasDiscount && Number.isFinite(product.originalPrice)
      ? product.originalPrice.toFixed(2)
      : undefined;
  const unitLabel = unitPriceSuffixText(product.unit || "-");
  const showM2Icon = isSquareMeterUnit(product.unit);
  const shadowEnabled = Boolean(product.productImageProcessedPath);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const ratio = getPreviewPixelRatio();
    stage.getLayers().forEach((layer) => {
      layer.getCanvas().setPixelRatio(ratio);
    });
    stage.batchDraw();
  }, [previewScale]);

  const clearSelection = () => setSelection(null);

  useImperativeHandle(ref, () => ({
    async exportTextOverlay() {
      await document.fonts.ready;
      flushSync(() => clearSelection());
      const stage = stageRef.current;
      const layer = textLayerRef.current;
      if (!stage || !layer) {
        return null;
      }

      applyExportStageSizing(stage, template);
      stage.draw();

      const dataUrl = layer.toDataURL({
        pixelRatio: EXPORT_PIXEL_RATIO,
        mimeType: "image/png",
      });

      applyPreviewStageSizing(stage, template, previewScale);
      stage.draw();

      return dataUrl;
    },
    async exportFullImage() {
      await document.fonts.ready;
      flushSync(() => clearSelection());

      const stage = stageRef.current;
      if (!stage) {
        return null;
      }

      const placeholder = stage.findOne((node: Konva.Node) => node.name() === "product-placeholder");
      const placeholderWasVisible = placeholder?.visible() ?? false;
      placeholder?.visible(false);

      applyExportStageSizing(stage, template);
      stage.draw();

      const dataUrl = stage.toDataURL({
        pixelRatio: EXPORT_PIXEL_RATIO,
        mimeType: "image/png",
      });

      placeholder?.visible(placeholderWasVisible);
      applyPreviewStageSizing(stage, template, previewScale);
      stage.draw();

      return dataUrl;
    },
  }));

  const handleStagePointerDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!interactiveProductImage && !interactiveText) return;
    if (isInteractiveCanvasTarget(event.target)) return;
    clearSelection();
  };

  const selectText = (id: TemplateTextBlockId) => setSelection({ type: "text", id });
  const isTextSelected = (id: TemplateTextBlockId) =>
    selection?.type === "text" && selection.id === id;

  const onTextGeometry = (blockId: TemplateTextBlockId) => (geometry: TextBlockGeometry) => {
    onTextBlockLayoutChange?.(blockId, geometry);
  };

  return (
    <Stage
      ref={stageRef}
      width={template.width * previewScale}
      height={template.height * previewScale}
      scaleX={previewScale}
      scaleY={previewScale}
      onMouseDown={handleStagePointerDown}
      onTouchStart={handleStagePointerDown}
    >
      <Layer>
        {backgroundImage ? (
          <Image
            name="background"
            image={backgroundImage}
            x={0}
            y={0}
            width={template.width}
            height={template.height}
            imageSmoothingEnabled
          />
        ) : null}

        {showProductPlaceholder && showProductPlate ? (
          <Rect
            name="product-placeholder"
            x={template.productLayer.x}
            y={template.productLayer.y}
            width={template.productLayer.width}
            height={template.productLayer.height}
            stroke="#fb923c"
            strokeWidth={2}
            dash={[8, 6]}
            fill="rgba(255,237,213,0.35)"
          />
        ) : null}

        {productImage && !interactiveProductImage ? (
          <Image
            image={productImage}
            x={productRect.x}
            y={productRect.y}
            width={productRect.width}
            height={productRect.height}
            imageSmoothingEnabled
          />
        ) : null}
      </Layer>

      {productImage && interactiveProductImage ? (
        <Layer>
          <ProductImageLayer
            image={productImage}
            rect={productRect}
            selected={selection?.type === "product"}
            shadowEnabled={shadowEnabled}
            canvasWidth={template.width}
            canvasHeight={template.height}
            onSelect={() => setSelection({ type: "product" })}
            onLayoutChange={onProductImageLayoutChange!}
          />
        </Layer>
      ) : null}

      <Layer ref={textLayerRef}>
        <EditableTextBlock
          block={template.textBlocks.productName}
          text={product.productName || "Nume produs"}
          selected={isTextSelected("productName")}
          interactive={interactiveText}
          canvasWidth={template.width}
          canvasHeight={template.height}
          onSelect={() => selectText("productName")}
          onLayoutChange={onTextGeometry("productName")}
        />
        <EditableTextBlock
          block={template.textBlocks.subtitle}
          text={subtitleText}
          selected={isTextSelected("subtitle")}
          interactive={interactiveText}
          canvasWidth={template.width}
          canvasHeight={template.height}
          onSelect={() => selectText("subtitle")}
          onLayoutChange={onTextGeometry("subtitle")}
        />
        <EditableTextBlock
          block={template.textBlocks.description}
          text={product.description || "Descriere produs"}
          selected={isTextSelected("description")}
          interactive={interactiveText}
          canvasWidth={template.width}
          canvasHeight={template.height}
          onSelect={() => selectText("description")}
          onLayoutChange={onTextGeometry("description")}
        />
        <PriceRow
          priceText={priceText}
          originalPriceText={originalPriceText}
          hasDiscount={Boolean(product.hasDiscount)}
          hasNewProduct={Boolean(product.hasNewProduct)}
          unitLabel={unitLabel}
          showM2Icon={showM2Icon}
          priceBlock={template.textBlocks.price}
          unitBlock={template.textBlocks.unit}
        />
        <BottomRows
          sizeWidth={showSize ? product.sizeWidth : ""}
          sizeHeight={showSize ? product.sizeHeight : ""}
          featureText={featureText}
          sizeBlock={template.textBlocks.size}
          featureBlock={template.textBlocks.feature}
          anchorFeatureAtSize={!showSize}
        />
      </Layer>
    </Stage>
  );
});
