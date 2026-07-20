/** Facebook organic photo pipeline — avoid Meta's aggressive downscale. */

/** Longest edge at/under this → Facebook typically does not resize further. */
export const FACEBOOK_MAX_LONG_EDGE = 2048;

/**
 * Meta docs: PNG over ~1MB „may appear pixelated”.
 * Prefer PNG when we can stay under this; otherwise high-quality JPEG.
 */
export const FACEBOOK_PNG_MAX_BYTES = 1 * 1024 * 1024;

export const FACEBOOK_JPEG_QUALITY = 92;

export const facebookTargetSize = (
  width: number,
  height: number,
  maxLongEdge = FACEBOOK_MAX_LONG_EDGE,
): { width: number; height: number; scale: number } => {
  const longEdge = Math.max(width, height);
  if (longEdge <= 0) {
    return { width: 0, height: 0, scale: 1 };
  }
  if (longEdge <= maxLongEdge) {
    return { width, height, scale: 1 };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
};
