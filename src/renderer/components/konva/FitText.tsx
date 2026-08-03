import { Text } from "react-konva";
import { useMemo } from "react";
import {
  createCanvasTextMeasurer,
  createEstimateTextMeasurer,
  fitSingleLineText,
  fitTextToBox,
  fitWrappedText,
} from "../../../services/layoutEngine";
import type { TextBlock } from "../../../shared/types";
import { GARET_FONT, TEXT_GLOW, konvaFontStyle } from "./textStyles";

interface FitTextProps {
  block: TextBlock;
  text: string;
  /** Offset local când e randat într-un Group (ex. EditableTextBlock). */
  x?: number;
  y?: number;
  listening?: boolean;
}

export function FitText({
  block,
  text,
  x = block.x,
  y = block.y,
  listening = false,
}: FitTextProps) {
  const measure = useMemo(
    () => createCanvasTextMeasurer() ?? createEstimateTextMeasurer(),
    [],
  );

  const fitMode = block.fitMode ?? "boxFit";

  const boxFitted = useMemo(
    () => (fitMode === "boxFit" ? fitTextToBox(text, block, measure) : null),
    [fitMode, text, block, measure],
  );
  const fitted = useMemo(
    () => (fitMode === "shrinkSingleLine" ? fitSingleLineText(text, block, measure) : null),
    [fitMode, text, block, measure],
  );
  const wrapped = useMemo(
    () => (fitMode === "shrinkWrap" ? fitWrappedText(text, block, measure) : null),
    [fitMode, text, block, measure],
  );

  if (fitMode === "boxFit" && boxFitted) {
    const lineHeightPx = boxFitted.fontSize * block.lineHeight;
    return (
      <>
        {boxFitted.lines.map((line, index) => (
          <Text
            key={`${block.id}-box-${index}`}
            x={x}
            y={y + index * lineHeightPx}
            text={line.text}
            fontSize={boxFitted.fontSize}
            fontFamily={GARET_FONT}
            fontStyle={konvaFontStyle(block)}
            fill={block.fill}
            lineHeight={block.lineHeight}
            listening={listening}
            {...TEXT_GLOW}
          />
        ))}
      </>
    );
  }

  if (fitMode === "shrinkWrap" && wrapped) {
    return (
      <>
        {wrapped.lines.map((line, index) => (
          <Text
            key={`${block.id}-${index}`}
            x={x}
            y={y + index * line.fontSize * block.lineHeight}
            text={line.text}
            fontSize={line.fontSize}
            fontFamily={GARET_FONT}
            fontStyle={konvaFontStyle(block)}
            fill={block.fill}
            lineHeight={block.lineHeight}
            listening={listening}
            {...TEXT_GLOW}
          />
        ))}
      </>
    );
  }

  return (
    <Text
      x={x}
      y={y}
      text={fitted?.text ?? text}
      fontSize={fitted?.fontSize ?? block.fontSize}
      fontFamily={GARET_FONT}
      fontStyle={konvaFontStyle(block)}
      fill={block.fill}
      lineHeight={block.lineHeight}
      listening={listening}
      {...TEXT_GLOW}
    />
  );
}
