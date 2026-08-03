import Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Image, Rect, Transformer } from "react-konva";
import type { LayerRect } from "../../../shared/types";

const MIN_PRODUCT_IMAGE_SIZE = 40;
const HOVER_STROKE = "rgba(251, 146, 60, 0.85)";
const SELECT_STROKE = "#fb923c";

interface ProductImageLayerProps {
  image: HTMLImageElement;
  rect: LayerRect;
  selected: boolean;
  shadowEnabled: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onLayoutChange: (layout: LayerRect) => void;
}

const clampRectToCanvas = (
  rect: LayerRect,
  canvasWidth: number,
  canvasHeight: number,
): LayerRect => {
  const width = Math.max(MIN_PRODUCT_IMAGE_SIZE, rect.width);
  const height = Math.max(MIN_PRODUCT_IMAGE_SIZE, rect.height);
  const x = Math.min(Math.max(rect.x, 0), Math.max(0, canvasWidth - width));
  const y = Math.min(Math.max(rect.y, 0), Math.max(0, canvasHeight - height));
  return { x, y, width, height };
};

export function ProductImageLayer({
  image,
  rect,
  selected,
  shadowEnabled,
  canvasWidth,
  canvasHeight,
  onSelect,
  onLayoutChange,
}: ProductImageLayerProps) {
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [hovered, setHovered] = useState(false);
  const showHoverOutline = hovered && !selected;

  useEffect(() => {
    const node = imageRef.current;
    if (!node) return;
    node.position({ x: rect.x, y: rect.y });
    node.size({ width: rect.width, height: rect.height });
    node.scaleX(1);
    node.scaleY(1);
  }, [rect.height, rect.width, rect.x, rect.y]);

  useEffect(() => {
    const transformer = transformerRef.current;
    const node = imageRef.current;
    if (!selected || !transformer || !node) {
      transformer?.nodes([]);
      return;
    }

    transformer.nodes([node]);
    transformer.getLayer()?.batchDraw();
  }, [rect, selected]);

  useEffect(() => {
    if (selected) setHovered(false);
  }, [selected]);

  const setStagePointer = (cursor: string) => {
    const stage = imageRef.current?.getStage();
    if (stage) {
      stage.container().style.cursor = cursor;
    }
  };

  const commitNodeLayout = () => {
    const node = imageRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const next = clampRectToCanvas(
      {
        x: node.x(),
        y: node.y(),
        width: Math.max(MIN_PRODUCT_IMAGE_SIZE, node.width() * scaleX),
        height: Math.max(MIN_PRODUCT_IMAGE_SIZE, node.height() * scaleY),
      },
      canvasWidth,
      canvasHeight,
    );

    node.position({ x: next.x, y: next.y });
    node.size({ width: next.width, height: next.height });
    onLayoutChange(next);
  };

  return (
    <>
      <Image
        ref={imageRef}
        name="product-image"
        image={image}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        imageSmoothingEnabled
        draggable
        shadowEnabled={shadowEnabled}
        shadowColor="black"
        shadowBlur={22}
        shadowOpacity={0.35}
        shadowOffsetX={0}
        shadowOffsetY={8}
        onMouseEnter={() => {
          if (selected) {
            setStagePointer("move");
            return;
          }
          setHovered(true);
          setStagePointer("pointer");
        }}
        onMouseLeave={() => {
          setHovered(false);
          setStagePointer("default");
        }}
        onClick={(event) => {
          event.cancelBubble = true;
          onSelect();
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          onSelect();
        }}
        onDragStart={() => {
          setHovered(false);
          setStagePointer("move");
        }}
        onDragEnd={() => {
          setStagePointer(selected ? "move" : "pointer");
          commitNodeLayout();
        }}
        onTransformEnd={commitNodeLayout}
      />
      {showHoverOutline ? (
        <Rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="rgba(251, 146, 60, 0.06)"
          stroke={HOVER_STROKE}
          strokeWidth={2}
          listening={false}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
        />
      ) : null}
      {selected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          borderStroke={SELECT_STROKE}
          anchorStroke={SELECT_STROKE}
          anchorFill="#fff7ed"
          anchorSize={10}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < MIN_PRODUCT_IMAGE_SIZE || newBox.height < MIN_PRODUCT_IMAGE_SIZE) {
              return oldBox;
            }
            if (newBox.x < 0 || newBox.y < 0) {
              return oldBox;
            }
            if (newBox.x + newBox.width > canvasWidth || newBox.y + newBox.height > canvasHeight) {
              return oldBox;
            }
            return newBox;
          }}
        />
      ) : null}
    </>
  );
}
