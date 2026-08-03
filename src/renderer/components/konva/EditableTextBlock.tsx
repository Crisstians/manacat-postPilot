import Konva from "konva";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Group, Rect, Transformer } from "react-konva";
import { resolveTextBlockHeight } from "../../../services/layoutEngine";
import type { TextBlock, TextBlockGeometry } from "../../../shared/types";
import { FitText } from "./FitText";

const MIN_TEXT_BOX_SIZE = 40;
/** Contur hover (stil Canva) — mai subtil decât selecția. */
const HOVER_STROKE = "rgba(251, 146, 60, 0.85)";
const SELECT_STROKE = "#fb923c";

interface EditableTextFrameProps {
  block: TextBlock;
  selected: boolean;
  interactive: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onLayoutChange: (geometry: TextBlockGeometry) => void;
  children: ReactNode;
}

const clampGeometry = (
  geometry: TextBlockGeometry,
  canvasWidth: number,
  canvasHeight: number,
): TextBlockGeometry => {
  const maxWidth = Math.max(MIN_TEXT_BOX_SIZE, geometry.maxWidth);
  const height = Math.max(MIN_TEXT_BOX_SIZE, geometry.height);
  const x = Math.min(Math.max(geometry.x, 0), Math.max(0, canvasWidth - maxWidth));
  const y = Math.min(Math.max(geometry.y, 0), Math.max(0, canvasHeight - height));
  return { x, y, maxWidth, height };
};

/** Cadru redimensionabil/mutabil peste conținut text (FitText sau layout-uri compuse). */
export function EditableTextFrame({
  block,
  selected,
  interactive,
  canvasWidth,
  canvasHeight,
  onSelect,
  onLayoutChange,
  children,
}: EditableTextFrameProps) {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [hovered, setHovered] = useState(false);
  const boxHeight = resolveTextBlockHeight(block);
  const showHoverOutline = interactive && hovered && !selected;

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    node.position({ x: block.x, y: block.y });
    node.scaleX(1);
    node.scaleY(1);
  }, [block.height, block.maxWidth, block.x, block.y]);

  useEffect(() => {
    const transformer = transformerRef.current;
    const node = groupRef.current;
    if (!selected || !interactive || !transformer || !node) {
      transformer?.nodes([]);
      return;
    }

    transformer.nodes([node]);
    transformer.getLayer()?.batchDraw();
  }, [block, interactive, selected]);

  useEffect(() => {
    if (selected) setHovered(false);
  }, [selected]);

  const setStagePointer = (cursor: string) => {
    const stage = groupRef.current?.getStage();
    if (stage) {
      stage.container().style.cursor = cursor;
    }
  };

  const commitNodeLayout = () => {
    const node = groupRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const next = clampGeometry(
      {
        x: node.x(),
        y: node.y(),
        maxWidth: Math.max(MIN_TEXT_BOX_SIZE, block.maxWidth * scaleX),
        height: Math.max(MIN_TEXT_BOX_SIZE, boxHeight * scaleY),
      },
      canvasWidth,
      canvasHeight,
    );

    node.position({ x: next.x, y: next.y });
    onLayoutChange(next);
  };

  if (!interactive) {
    return <>{children}</>;
  }

  return (
    <>
      <Group
        ref={groupRef}
        name={`text-block-${block.id}`}
        x={block.x}
        y={block.y}
        draggable
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
      >
        {children}
        <Rect
          name={`text-hit-${block.id}`}
          x={0}
          y={0}
          width={block.maxWidth}
          height={boxHeight}
          fill={showHoverOutline ? "rgba(251, 146, 60, 0.06)" : "rgba(251, 146, 60, 0.001)"}
          stroke={showHoverOutline ? HOVER_STROKE : undefined}
          strokeWidth={showHoverOutline ? 2 : 0}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          listening
        />
      </Group>
      {selected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio={false}
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
          borderStroke={SELECT_STROKE}
          anchorStroke={SELECT_STROKE}
          anchorFill="#fff7ed"
          anchorSize={10}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < MIN_TEXT_BOX_SIZE || newBox.height < MIN_TEXT_BOX_SIZE) {
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

interface EditableTextBlockProps {
  block: TextBlock;
  text: string;
  selected: boolean;
  interactive: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onLayoutChange: (geometry: TextBlockGeometry) => void;
}

export function EditableTextBlock({
  block,
  text,
  selected,
  interactive,
  canvasWidth,
  canvasHeight,
  onSelect,
  onLayoutChange,
}: EditableTextBlockProps) {
  if (!interactive) {
    return <FitText block={block} text={text} />;
  }

  return (
    <EditableTextFrame
      block={block}
      selected={selected}
      interactive={interactive}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      onSelect={onSelect}
      onLayoutChange={onLayoutChange}
    >
      <FitText block={block} text={text} x={0} y={0} />
    </EditableTextFrame>
  );
}
