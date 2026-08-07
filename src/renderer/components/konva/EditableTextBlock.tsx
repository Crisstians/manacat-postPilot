import Konva from "konva";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Group, Rect, Transformer } from "react-konva";
import { resolveTextBlockHeight } from "../../../services/layoutEngine";
import type { TextBlock, TextBlockGeometry } from "../../../shared/types";
import { FitText } from "./FitText";

const MIN_TEXT_BOX_SIZE = 40;
/** Minim px pe stage înainte să înceapă drag-ul — click simplu nu mută box-ul. */
const TEXT_DRAG_DISTANCE = 5;
const LAYOUT_EPSILON = 0.5;
/** Contur hover (stil Canva) — mai subtil decât selecția. */
const HOVER_STROKE = "rgba(251, 146, 60, 0.85)";
const SELECT_STROKE = "#fb923c";

interface EditableTextFrameProps {
  block: TextBlock;
  selected: boolean;
  interactive: boolean;
  editing?: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onEditRequest?: () => void;
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

const stopDomBubble = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
  event.cancelBubble = true;
  event.evt.stopPropagation();
};

/** Cadru redimensionabil/mutabil peste conținut text (FitText sau layout-uri compuse). */
export function EditableTextFrame({
  block,
  selected,
  interactive,
  editing = false,
  canvasWidth,
  canvasHeight,
  onSelect,
  onEditRequest,
  onLayoutChange,
  children,
}: EditableTextFrameProps) {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const didDragRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const boxHeight = resolveTextBlockHeight(block);
  const showHoverOutline = interactive && hovered && !selected && !editing;
  const showTransformer = selected && interactive && !editing;
  // Doar textul selectat se poate muta — click pe neslectat = select, nu drag.
  const canDrag = selected && !editing;

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
    if (!showTransformer || !transformer || !node) {
      transformer?.nodes([]);
      return;
    }

    transformer.nodes([node]);
    transformer.getLayer()?.batchDraw();
  }, [block, showTransformer]);

  useEffect(() => {
    if (selected || editing) setHovered(false);
  }, [selected, editing]);

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

    const unchanged =
      Math.abs(next.x - block.x) < LAYOUT_EPSILON &&
      Math.abs(next.y - block.y) < LAYOUT_EPSILON &&
      Math.abs(next.maxWidth - block.maxWidth) < LAYOUT_EPSILON &&
      Math.abs(next.height - boxHeight) < LAYOUT_EPSILON;

    if (unchanged) return;
    onLayoutChange(next);
  };

  const handleSelectClick = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    stopDomBubble(event);
    if (editing) return;
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    onSelect();
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
        draggable={canDrag}
        dragDistance={TEXT_DRAG_DISTANCE}
        onMouseDown={(event) => {
          didDragRef.current = false;
          stopDomBubble(event);
        }}
        onTouchStart={(event) => {
          didDragRef.current = false;
          stopDomBubble(event);
        }}
        onMouseEnter={() => {
          if (editing) {
            setStagePointer("text");
            return;
          }
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
        onClick={handleSelectClick}
        onTap={handleSelectClick}
        onDblClick={(event) => {
          stopDomBubble(event);
          if (editing) return;
          didDragRef.current = false;
          onSelect();
          onEditRequest?.();
        }}
        onDblTap={(event) => {
          stopDomBubble(event);
          if (editing) return;
          didDragRef.current = false;
          onSelect();
          onEditRequest?.();
        }}
        onDragStart={() => {
          didDragRef.current = true;
          setHovered(false);
          setStagePointer("move");
        }}
        onDragEnd={() => {
          setStagePointer(selected ? "move" : "pointer");
          if (!didDragRef.current) {
            // Anulare / click fără mișcare — pune nodul înapoi.
            const node = groupRef.current;
            if (node) node.position({ x: block.x, y: block.y });
            return;
          }
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
      {showTransformer ? (
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
  editing?: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onEditRequest?: () => void;
  onLayoutChange: (geometry: TextBlockGeometry) => void;
}

export function EditableTextBlock({
  block,
  text,
  selected,
  interactive,
  editing = false,
  canvasWidth,
  canvasHeight,
  onSelect,
  onEditRequest,
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
      editing={editing}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      onSelect={onSelect}
      onEditRequest={onEditRequest}
      onLayoutChange={onLayoutChange}
    >
      {editing ? null : <FitText block={block} text={text} x={0} y={0} />}
    </EditableTextFrame>
  );
}
