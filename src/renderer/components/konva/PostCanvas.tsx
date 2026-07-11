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
import { isSquareMeterUnit, unitPriceSuffixText } from "../../../shared/unitDisplay";
import { BottomRows } from "./BottomRows";
import { FitText } from "./FitText";
import { PriceRow } from "./PriceRow";
import { ProductImageLayer } from "./ProductImageLayer";
import { useKonvaImage } from "./useKonvaImage";

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

const resolveImageSrc = (path: string): string => resolveProductImageSource(path);

const resolveBackgroundSrc = (path: string): string => resolveTemplateImageSource(path);

const getSubtitleText = (category: ProductInput["category"]): string =>
  category === "gresie" ? "Placă ceramică\nPremium" : category;

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
  const backgroundImage = useKonvaImage(backgroundSrc);
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

  const subtitleLines = getSubtitleText(product.category).split("\n");
  const productNameLines = splitProductNameLines(product.productName || "Nume produs");
  const featureText = product.features[0] ?? "-";
  const priceText = Number.isFinite(product.price) ? product.price.toFixed(2) : "0.00";
  const unitLabel = unitPriceSuffixText(product.unit || "-");
  const showM2Icon = isSquareMeterUnit(product.unit);
  const shadowEnabled = Boolean(product.productImageProcessedPath);

  useImperativeHandle(ref, () => ({
    async exportTextOverlay() {
      await document.fonts.ready;
      const layer = textLayerRef.current;
      if (!layer) {
        return null;
      }
      return layer.toDataURL({
        pixelRatio: previewScale > 0 ? 1 / previewScale : 1,
        mimeType: "image/png",
      });
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
      stage.draw();

      const pixelRatio = previewScale > 0 ? 1 / previewScale : 1;
      const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/png" });

      placeholder?.visible(placeholderWasVisible);
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
