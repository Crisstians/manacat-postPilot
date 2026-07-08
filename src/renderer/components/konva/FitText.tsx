import { Text } from "react-konva";
import { useMemo } from "react";
import {
  createCanvasTextMeasurer,
  createEstimateTextMeasurer,
  fitSingleLineText,
  fitWrappedText,
  GARET_FONT_FAMILY,
} from "../../../services/layoutEngine";
import type { TextBlock } from "../../../shared/types";
import { GARET_FONT, TEXT_GLOW, konvaFontStyle } from "./textStyles";

interface FitTextProps {
  block: TextBlock;
  text: string;
  y?: number;
}

export function FitText({ block, text, y = block.y }: FitTextProps) {
  const measure = useMemo(
    () => createCanvasTextMeasurer() ?? createEstimateTextMeasurer(),
    [],
  );

  const fitMode = block.fitMode ?? "shrinkSingleLine";
  // Pentru `description` impunem wrap-ul după caractere (20/40/60),
  // indiferent de fitMode, ca să nu rămână un singur „cuvânt” pe o linie
  // când textul nu are spații (ex: "aaaa....").
  const isFixedDescriptionWrap = block.id === "description";

  const forcedDescription = useMemo(() => {
    if (!isFixedDescriptionWrap) return null;

    const normalized = (text ?? "").replace(/\s+/g, " ").trim();
    // Reguli cerute:
    // - maxim 3 linii
    // - max 20 caractere/lina (total 60)
    // - preferă să nu întrerupă cuvintele; doar dacă un cuvânt e mai lung decât 20 îl tai în bucăți.
    const LINE_CHAR_LIMIT = 20;
    const MAX_LINES = 3;

    const words = normalized.split(" ").filter(Boolean);
    const lines: string[] = [];
    const queue = [...words];

    while (lines.length < MAX_LINES && queue.length > 0) {
      let line = "";

      while (queue.length > 0) {
        const word = queue[0];

        if (!line) {
          if (word.length <= LINE_CHAR_LIMIT) {
            line = word;
            queue.shift();
            break;
          }

          // Cuvânt foarte lung: îl tăiem ca să iasă din colaps (ex: "aaaa....").
          line = word.slice(0, LINE_CHAR_LIMIT);
          queue[0] = word.slice(LINE_CHAR_LIMIT);
          break;
        }

        const candidate = `${line} ${word}`;
        if (candidate.length <= LINE_CHAR_LIMIT) {
          line = candidate;
          queue.shift();
          continue;
        }

        // Nu mai încape următorul cuvânt pe linia curentă.
        break;
      }

      const trimmed = line.trim();
      if (trimmed) {
        lines.push(trimmed);
      } else {
        // fallback (nu ar trebui să se întâmple, dar evităm bucle infinite)
        queue.shift();
      }
    }

    // limităm strict la max 60 caractere total prin limită de linii * 20
    const slicedLines = lines.slice(0, MAX_LINES).map((l) => l.slice(0, LINE_CHAR_LIMIT));
    const filtered = slicedLines.filter((l) => l.length > 0);
    const finalLines = filtered.length > 0 ? filtered : [];

    const weight = block.weight ?? 700;
    const minSize = block.minFontSize ?? Math.round(block.fontSize * 0.6);

    // Alegem un singur fontSize comun pentru toate liniile (similar cu shrinkWrap),
    // dar cu limitele de caractere impuse de utilizator.
    let bestSize = minSize;
    const maxLines = 3;
    const totalLines = Math.min(finalLines.length, maxLines);

    for (let size = block.fontSize; size >= minSize; size -= 1) {
      const fitsWidth = lines
        .slice(0, totalLines)
        .every((line) =>
          measure({
            text: line,
            fontSize: size,
            fontFamily: GARET_FONT_FAMILY,
            fontWeight: weight,
          }).width <= block.maxWidth,
        );

      const totalHeight = totalLines * size * block.lineHeight;
      const fitsHeight = totalHeight <= block.fontSize * block.lineHeight * maxLines;

      if (fitsWidth && fitsHeight) {
        bestSize = size;
        break;
      }
    }

    return {
      fontSize: bestSize,
      lines: finalLines.slice(0, totalLines),
    };
  }, [block, isFixedDescriptionWrap, measure, text]);

  const fitted = useMemo(
    () => (fitMode === "shrinkWrap" ? null : fitSingleLineText(text, block, measure)),
    [fitMode, text, block, measure],
  );
  const wrapped = useMemo(
    () => (fitMode === "shrinkWrap" ? fitWrappedText(text, block, measure) : null),
    [fitMode, text, block, measure],
  );

  if (isFixedDescriptionWrap && forcedDescription && forcedDescription.lines.length > 0) {
    return (
      <>
        {forcedDescription.lines.map((lineText, index) => (
          <Text
            key={`${block.id}-${index}`}
            x={block.x}
            y={block.y + index * forcedDescription.fontSize * block.lineHeight}
            text={lineText}
            fontSize={forcedDescription.fontSize}
            fontFamily={GARET_FONT}
            fontStyle={konvaFontStyle(block)}
            fill={block.fill}
            lineHeight={block.lineHeight}
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
            x={block.x}
            y={line.y}
            text={line.text}
            fontSize={line.fontSize}
            fontFamily={GARET_FONT}
            fontStyle={konvaFontStyle(block)}
            fill={block.fill}
            lineHeight={block.lineHeight}
            {...TEXT_GLOW}
          />
        ))}
      </>
    );
  }

  return (
    <Text
      x={block.x}
      y={y}
      text={fitted?.text ?? text}
      fontSize={fitted?.fontSize ?? block.fontSize}
      fontFamily={GARET_FONT}
      fontStyle={konvaFontStyle(block)}
      fill={block.fill}
      lineHeight={block.lineHeight}
      {...TEXT_GLOW}
    />
  );
}
