import type { LayerRect } from "../shared/types.js";

interface ContainRectInput {
  sourceWidth: number;
  sourceHeight: number;
  target: LayerRect;
}

export interface ContainRectResult extends LayerRect {}

export const computeContainRect = ({
  sourceWidth,
  sourceHeight,
  target,
}: ContainRectInput): ContainRectResult => {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return target;
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = target.width / target.height;

  if (sourceRatio > targetRatio) {
    const width = target.width;
    const height = width / sourceRatio;
    return {
      x: target.x,
      y: target.y + (target.height - height) / 2,
      width,
      height,
    };
  }

  const height = target.height;
  const width = height * sourceRatio;
  return {
    x: target.x + (target.width - width) / 2,
    y: target.y,
    width,
    height,
  };
};

export const resolveProductImageRect = (
  sourceWidth: number,
  sourceHeight: number,
  target: LayerRect,
  override?: LayerRect,
): ContainRectResult => {
  if (override) {
    return override;
  }

  return computeContainRect({ sourceWidth, sourceHeight, target });
};

/** Umple zona țintă păstrând proporțiile; poate decupa marginile, dar nu deformează. */
export const computeCoverRect = ({
  sourceWidth,
  sourceHeight,
  target,
}: ContainRectInput): ContainRectResult => {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return target;
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = target.width / target.height;

  if (sourceRatio > targetRatio) {
    const height = target.height;
    const width = height * sourceRatio;
    return {
      x: target.x + (target.width - width) / 2,
      y: target.y,
      width,
      height,
    };
  }

  const width = target.width;
  const height = width / sourceRatio;
  return {
    x: target.x,
    y: target.y + (target.height - height) / 2,
    width,
    height,
  };
};

/** Varianta `cover` ancorată în dreapta-jos (fără deformare, doar crop). */
export const computeCoverRectBottomRight = ({
  sourceWidth,
  sourceHeight,
  target,
}: ContainRectInput): ContainRectResult => {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return target;
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = target.width / target.height;

  // Umple înălțimea (și decupează orizontal) sau umple lățimea (și decupează vertical),
  // apoi ancorează colțul bottom-right.
  if (sourceRatio > targetRatio) {
    const height = target.height;
    const width = height * sourceRatio;
    return {
      x: target.x + (target.width - width),
      y: target.y,
      width,
      height,
    };
  }

  const width = target.width;
  const height = width / sourceRatio;
  return {
    x: target.x,
    y: target.y + (target.height - height),
    width,
    height,
  };
};
