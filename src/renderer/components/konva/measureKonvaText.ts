import Konva from "konva";
import { GARET_FONT } from "./textStyles";

export interface KonvaTextMeasureInput {
  text: string;
  fontSize: number;
  fontStyle?: string;
  fontFamily?: string;
}

export const measureKonvaTextWidth = ({
  text,
  fontSize,
  fontStyle = "normal",
  fontFamily = GARET_FONT,
}: KonvaTextMeasureInput): number => {
  const node = new Konva.Text({
    text,
    fontSize,
    fontStyle,
    fontFamily,
  });
  const width = node.getTextWidth();
  node.destroy();
  return width;
};

export const preloadGaretFonts = async (sizes: number[]): Promise<void> => {
  if (typeof document === "undefined") {
    return;
  }

  const loads = sizes.flatMap((size) => [
    document.fonts.load(`400 ${size}px Garet`),
    document.fonts.load(`700 ${size}px Garet`),
  ]);

  await Promise.all(loads);
  await document.fonts.ready;
};
