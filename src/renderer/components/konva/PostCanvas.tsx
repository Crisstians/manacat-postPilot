import Konva from "konva";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Image, Layer, Rect, Stage } from "react-konva";
import {
  resolveProductImageRect,
} from "../../../services/layout";
import {
  createEstimateTextMeasurer,
  layoutDiscountPriceBlock,
  layoutPriceRow,
  resolveTextBlockHeight,
} from "../../../services/layoutEngine";
import {
  applyDiscountLayoutOverrides,
  loadCommittedDiscountLayoutOverrides,
} from "../../../shared/discountLayoutOverrides";
import { categoryShowsProductPlate, categoryUsesSize } from "../../../shared/categoryLayout";
import { PRODUCT_FIELD_LIMITS } from "../../../shared/productFieldLimits";
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
import {
  CanvasInlineTextEditor,
  type CanvasInlineTextEditorHandle,
  type InlineEditableField,
  type InlineTextEditSession,
} from "./CanvasInlineTextEditor";
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
  onTextContentChange?: (field: InlineEditableField, value: string) => void;
  onViewportPanStart?: (clientX: number, clientY: number) => void;
}

type CanvasSelection =
  | { type: "product" }
  | { type: "text"; id: TemplateTextBlockId }
  | { type: "price" }
  | null;

type ContentTextField = "productName" | "subtitle" | "description";

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
  if (
    name === "product-image" ||
    name.startsWith("text-block-") ||
    name.startsWith("text-hit-")
  ) {
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

const readPointerClient = (
  event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
): { clientX: number; clientY: number } | null => {
  const native = event.evt;
  if ("touches" in native) {
    const touch = native.touches[0] ?? native.changedTouches[0];
    return touch ? { clientX: touch.clientX, clientY: touch.clientY } : null;
  }
  if (native.button !== 0) return null;
  return { clientX: native.clientX, clientY: native.clientY };
};

export const PostCanvas = forwardRef<PostCanvasHandle, PostCanvasProps>(function PostCanvas(
  {
    product,
    template,
    showProductPlaceholder = true,
    previewScale = 1,
    onProductImageLayoutChange,
    onTextBlockLayoutChange,
    onTextContentChange,
    onViewportPanStart,
  },
  ref,
) {
  const textLayerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const inlineEditorRef = useRef<CanvasInlineTextEditorHandle>(null);
  const [selection, setSelection] = useState<CanvasSelection>(null);
  const [editing, setEditing] = useState<InlineTextEditSession | null>(null);
  const backgroundSrc = template.backgroundImagePath
    ? resolveBackgroundSrc(template.backgroundImagePath)
    : undefined;
  const productSrc = product.productImagePath
    ? resolveImageSrc(getDisplayProductImagePath(product))
    : undefined;
  const backgroundImage = useKonvaImageFromSrc(backgroundSrc);
  const productImage = useKonvaImage(productSrc);
  const interactiveProductImage = Boolean(productImage && onProductImageLayoutChange);
  const contentEditable = Boolean(onTextContentChange);
  const interactiveText = Boolean(onTextBlockLayoutChange) || contentEditable;

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
    setEditing(null);
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

  const clearSelection = () => {
    if (editing) {
      inlineEditorRef.current?.commit();
    }
    setSelection(null);
    setEditing(null);
  };

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
    if (isInteractiveCanvasTarget(event.target)) return;
    if (interactiveProductImage || interactiveText || contentEditable) {
      clearSelection();
    }
    const point = readPointerClient(event);
    if (point) {
      onViewportPanStart?.(point.clientX, point.clientY);
    }
  };

  const selectText = (id: TemplateTextBlockId) => setSelection({ type: "text", id });
  const isTextSelected = (id: TemplateTextBlockId) =>
    selection?.type === "text" && selection.id === id;
  const isEditingField = (field: InlineEditableField) => editing?.field === field;

  const onTextGeometry = (blockId: TemplateTextBlockId) => (geometry: TextBlockGeometry) => {
    onTextBlockLayoutChange?.(blockId, geometry);
  };

  const startContentEdit = (field: ContentTextField) => {
    if (!onTextContentChange) return;
    const block = template.textBlocks[field];
    const value =
      field === "productName"
        ? product.productName
        : field === "subtitle"
          ? product.subtitle.trim() || defaultSubtitleForCategory(product.category)
          : product.description;

    setSelection({ type: "text", id: field });
    setEditing({
      field,
      x: block.x,
      y: block.y,
      width: block.maxWidth,
      height: resolveTextBlockHeight(block),
      value,
      fontSize: block.fontSize,
      fontWeight: block.weight ?? 700,
      fill: block.fill,
      multiline: field === "subtitle" || field === "description",
      maxLength: PRODUCT_FIELD_LIMITS[field],
    });
  };

  const startPriceEdit = () => {
    if (!onTextContentChange) return;
    const priceBlock = template.textBlocks.price;
    const unitBlock = template.textBlocks.unit;
    const measure = createEstimateTextMeasurer();
    let x = priceBlock.x;
    let y = priceBlock.y;
    let width = Math.max(priceBlock.maxWidth * 0.45, 200);
    let fontSize = priceBlock.fontSize;

    if (product.hasDiscount && originalPriceText) {
      const discountLayout = applyDiscountLayoutOverrides(
        layoutDiscountPriceBlock(
          priceText,
          originalPriceText,
          unitLabel,
          showM2Icon,
          priceBlock,
          unitBlock,
          measure,
        ),
        loadCommittedDiscountLayoutOverrides(),
      );
      x = discountLayout.sale.price.x;
      y = discountLayout.sale.price.y;
      width = Math.max(discountLayout.sale.price.width, 200);
      fontSize = discountLayout.sale.price.fontSize;
    } else {
      const saleLayout = layoutPriceRow(
        priceText,
        unitLabel,
        showM2Icon,
        priceBlock,
        unitBlock,
        measure,
      );
      x = saleLayout.price.x;
      y = saleLayout.price.y;
      width = Math.max(saleLayout.price.width, 200);
      fontSize = saleLayout.price.fontSize;
    }

    setSelection({ type: "price" });
    setEditing({
      field: "price",
      x,
      y,
      width,
      height: resolveTextBlockHeight(priceBlock),
      value: product.price > 0 ? product.price.toFixed(2) : "",
      fontSize,
      fontWeight: priceBlock.weight ?? 800,
      fill: priceBlock.fill,
      multiline: false,
    });
  };

  const commitInlineEdit = (value: string) => {
    if (!editing || !onTextContentChange) {
      setEditing(null);
      return;
    }
    onTextContentChange(editing.field, value);
    setEditing(null);
  };

  const stageWidth = template.width * previewScale;
  const stageHeight = template.height * previewScale;

  return (
    <div className="relative" style={{ width: stageWidth, height: stageHeight }}>
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
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
              onSelect={() => {
                setEditing(null);
                setSelection({ type: "product" });
              }}
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
            editing={isEditingField("productName")}
            canvasWidth={template.width}
            canvasHeight={template.height}
            onSelect={() => {
              setEditing(null);
              selectText("productName");
            }}
            onEditRequest={contentEditable ? () => startContentEdit("productName") : undefined}
            onLayoutChange={onTextGeometry("productName")}
          />
          <EditableTextBlock
            block={template.textBlocks.subtitle}
            text={subtitleText}
            selected={isTextSelected("subtitle")}
            interactive={interactiveText}
            editing={isEditingField("subtitle")}
            canvasWidth={template.width}
            canvasHeight={template.height}
            onSelect={() => {
              setEditing(null);
              selectText("subtitle");
            }}
            onEditRequest={contentEditable ? () => startContentEdit("subtitle") : undefined}
            onLayoutChange={onTextGeometry("subtitle")}
          />
          <EditableTextBlock
            block={template.textBlocks.description}
            text={product.description || "Descriere produs"}
            selected={isTextSelected("description")}
            interactive={interactiveText}
            editing={isEditingField("description")}
            canvasWidth={template.width}
            canvasHeight={template.height}
            onSelect={() => {
              setEditing(null);
              selectText("description");
            }}
            onEditRequest={contentEditable ? () => startContentEdit("description") : undefined}
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
            interactive={contentEditable}
            selected={selection?.type === "price"}
            editing={isEditingField("price")}
            onSelect={
              contentEditable
                ? () => {
                    setEditing(null);
                    setSelection({ type: "price" });
                  }
                : undefined
            }
            onEditRequest={contentEditable ? startPriceEdit : undefined}
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

      {editing ? (
        <CanvasInlineTextEditor
          ref={inlineEditorRef}
          session={editing}
          previewScale={previewScale}
          onCommit={commitInlineEdit}
          onCancel={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
});
