import type { TextBlock } from "../../../shared/types";
import { EXPORT_PIXEL_RATIO as SHARED_EXPORT_PIXEL_RATIO } from "../../../shared/exportQuality";

export const GARET_FONT = "Garet, Inter, Arial, sans-serif";

/** Glow discret — blur mare înmuia textul la zoom pe Facebook. */
export const TEXT_GLOW = {
  shadowColor: "#000000",
  shadowBlur: 10,
  shadowOpacity: 0.55,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

export const EXPORT_PIXEL_RATIO = SHARED_EXPORT_PIXEL_RATIO;

export const konvaFontStyle = (block: TextBlock): string =>
  (block.weight ?? 700) >= 700 ? "bold" : "normal";
