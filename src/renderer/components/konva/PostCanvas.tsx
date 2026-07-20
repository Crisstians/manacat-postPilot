import Konva from "konva";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Image, Layer, Rect, Stage } from "react-konva";
import {
  resolveProductImageRect,
  computeCoverRectBottomRight,
} from "../../../services/layout";
import { getDisplayProductImagePath } from "../../../shared/productImage";
import { resolveProductImageSource } from "../../productImageSource";
import { resolveTemplateImageSource } from "../../templateImageSource";
import type { LayerRect, ProductInput, TemplateLayout } from "../../../shared/types";
import { splitProductNameLines } from "../../../shared/productFieldLimits";
import { getProductSubtitleLines } from "../../../shared/productSubtitle";
import { isSquareMeterUnit, unitPriceSuffixText } from "../../../shared/unitDisplay";
import { BottomRows } from "./BottomRows";
import { FitText } from "./FitText";
import { PriceRow } from "./PriceRow";
import { ProductImageLayer } from "./ProductImageLayer";
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
}

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
    layer.getCanvas().setPixelRatio(1);
  });
};

const resolveImageSrc = (path: string): string => resolveProductImageSource(path);

const resolveBackgroundSrc = (path: string): string => resolveTemplateImageSource(path);

const isProductImageTarget = (target: Konva.Node): boolean => {
  if (target.name() === "product-image") {
    return true;
  }

  let parent = target.getParent();
  while (parent) {
    if (parent.className === "Transformer") {
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
  },
  ref,
) {
  const textLayerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [isProductSelected, setIsProductSelected] = useState(false);
  const backgroundSrc = template.backgroundImagePath
    ? resolveBackgroundSrc(template.backgroundImagePath)
    : undefined;
  const productSrc = product.productImagePath
    ? resolveImageSrc(getDisplayProductImagePath(product))
    : undefined;
  const backgroundImage = useKonvaImageFromSrc(backgroundSrc);
  const productImage = useKonvaImage(productSrc);
  const interactiveProductImage = Boolean(productImage && onProductImageLayoutChange);

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

  const backgroundRect = useMemo(() => {
    if (!backgroundImage) {
      return { x: 0, y: 0, width: template.width, height: template.height };
    }

    return computeCoverRectBottomRight({
      sourceWidth: backgroundImage.width,
      sourceHeight: backgroundImage.height,
      target: { x: 0, y: 0, width: template.width, height: template.height },
    });
  }, [backgroundImage, template.height, template.width]);

  useEffect(() => {
    setIsProductSelected(false);
  }, [product.productImagePath]);

  const subtitleLines = getProductSubtitleLines(product);
  const productNameLines = splitProductNameLines(product.productName || "Nume produs");
  const featureText = product.features[0] ?? "-";
  const priceText = Number.isFinite(product.price) ? product.price.toFixed(2) : "0.00";
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

  useImperativeHandle(ref, () => ({
    async exportTextOverlay() {
      await document.fonts.ready;
      const stage = stageRef.current;
      const layer = textLayerRef.current;
      if (!stage || !layer) {
        return null;
      }

      applyExportStageSizing(stage, template);
      stage.draw();

      const dataUrl = layer.toDataURL({
        pixelRatio: 1,
        mimeType: "image/png",
      });

      applyPreviewStageSizing(stage, template, previewScale);
      stage.draw();

      return dataUrl;
    },
    async exportFullImage() {
      await document.fonts.ready;
      setIsProductSelected(false);

      const stage = stageRef.current;
      if (!stage) {
        return null;
      }

      const placeholder = stage.findOne((node: Konva.Node) => node.name() === "product-placeholder");
      const placeholderWasVisible = placeholder?.visible() ?? false;
      placeholder?.visible(false);

      applyExportStageSizing(stage, template);
      stage.draw();

      const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" });

      placeholder?.visible(placeholderWasVisible);
      applyPreviewStageSizing(stage, template, previewScale);
      stage.draw();

      return dataUrl;
    },
  }));

  const handleStagePointerDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!interactiveProductImage) return;
    if (isProductImageTarget(event.target)) return;
    setIsProductSelected(false);
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
            x={backgroundRect.x}
            y={backgroundRect.y}
            width={backgroundRect.width}
            height={backgroundRect.height}
            imageSmoothingEnabled
          />
        ) : null}

        {showProductPlaceholder ? (
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
            selected={isProductSelected}
            shadowEnabled={shadowEnabled}
            canvasWidth={template.width}
            canvasHeight={template.height}
            onSelect={() => setIsProductSelected(true)}
            onLayoutChange={onProductImageLayoutChange!}
          />
        </Layer>
      ) : null}

      <Layer ref={textLayerRef}>
        {productNameLines.map((line, index) => {
          const block = template.textBlocks.productName;
          const lineY = block.y + index * block.fontSize * block.lineHeight;
          return (
            <FitText
              key={`productName-${index}`}
              block={block}
              text={line}
              y={lineY}
            />
          );
        })}
        {subtitleLines.map((line, index) => {
          const block = template.textBlocks.subtitle;
          const lineY = block.y + index * block.fontSize * block.lineHeight;
          return (
            <FitText
              key={`subtitle-${index}`}
              block={block}
              text={line}
              y={lineY}
            />
          );
        })}
        <FitText
          block={template.textBlocks.description}
          text={product.description || "Descriere produs"}
        />
        <PriceRow
          priceText={priceText}
          unitLabel={unitLabel}
          showM2Icon={showM2Icon}
          priceBlock={template.textBlocks.price}
          unitBlock={template.textBlocks.unit}
        />
        <BottomRows
          sizeWidth={product.sizeWidth}
          sizeHeight={product.sizeHeight}
          featureText={featureText}
          sizeBlock={template.textBlocks.size}
          featureBlock={template.textBlocks.feature}
        />
      </Layer>
    </Stage>
  );
});
