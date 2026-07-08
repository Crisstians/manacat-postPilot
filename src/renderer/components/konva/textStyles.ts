import type { TextBlock } from "../../../shared/types";

export const GARET_FONT = "Garet, Inter, Arial, sans-serif";

export const TEXT_GLOW = {
  shadowColor: "#000000",
  shadowBlur: 50,
  shadowOpacity: 0.9,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

export const konvaFontStyle = (block: TextBlock): string =>
  (block.weight ?? 700) >= 700 ? "bold" : "normal";
