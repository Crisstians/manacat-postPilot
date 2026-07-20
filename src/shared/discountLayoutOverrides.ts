import type { DiscountPriceBlockLayout } from "../services/layoutEngine.js";
import committedOverrides from "./discountLayoutOverrides.json";

export type DiscountLayoutPoint = { x: number; y: number };

export interface DiscountLayoutOverrides {
  badge?: DiscountLayoutPoint;
  newProductBadge?: DiscountLayoutPoint;
  original?: DiscountLayoutPoint;
  sale?: DiscountLayoutPoint;
  strike?: DiscountLayoutPoint;
}

const isPoint = (value: unknown): value is DiscountLayoutPoint =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as DiscountLayoutPoint).x === "number" &&
  typeof (value as DiscountLayoutPoint).y === "number" &&
  Number.isFinite((value as DiscountLayoutPoint).x) &&
  Number.isFinite((value as DiscountLayoutPoint).y);

export const normalizeDiscountLayoutOverrides = (value: unknown): DiscountLayoutOverrides => {
  if (typeof value !== "object" || value === null) return {};
  const record = value as Record<string, unknown>;
  const next: DiscountLayoutOverrides = {};
  if (isPoint(record.badge)) next.badge = { x: Math.round(record.badge.x), y: Math.round(record.badge.y) };
  if (isPoint(record.newProductBadge)) {
    next.newProductBadge = {
      x: Math.round(record.newProductBadge.x),
      y: Math.round(record.newProductBadge.y),
    };
  }
  if (isPoint(record.original)) {
    next.original = { x: Math.round(record.original.x), y: Math.round(record.original.y) };
  }
  if (isPoint(record.sale)) next.sale = { x: Math.round(record.sale.x), y: Math.round(record.sale.y) };
  if (isPoint(record.strike)) {
    next.strike = { x: Math.round(record.strike.x), y: Math.round(record.strike.y) };
  }
  return next;
};

/** Poziții fixe din proiect — fără editor DEV în runtime. */
export const loadCommittedDiscountLayoutOverrides = (): DiscountLayoutOverrides =>
  normalizeDiscountLayoutOverrides(committedOverrides);

const shiftPriceRow = (
  row: DiscountPriceBlockLayout["original"],
  dx: number,
  dy: number,
): DiscountPriceBlockLayout["original"] => ({
  price: { ...row.price, x: row.price.x + dx, y: row.price.y + dy },
  unit: { ...row.unit, x: row.unit.x + dx, y: row.unit.y + dy },
  icon: row.icon
    ? { ...row.icon, x: row.icon.x + dx, y: row.icon.y + dy }
    : undefined,
});

export const applyDiscountLayoutOverrides = (
  layout: DiscountPriceBlockLayout,
  overrides: DiscountLayoutOverrides,
): DiscountPriceBlockLayout => {
  let next = layout;

  if (overrides.badge) {
    next = {
      ...next,
      badge: { ...next.badge, x: overrides.badge.x, y: overrides.badge.y },
    };
  }

  if (overrides.original) {
    next = {
      ...next,
      original: shiftPriceRow(
        next.original,
        overrides.original.x - next.original.price.x,
        overrides.original.y - next.original.price.y,
      ),
    };
  }

  if (overrides.sale) {
    next = {
      ...next,
      sale: shiftPriceRow(
        next.sale,
        overrides.sale.x - next.sale.price.x,
        overrides.sale.y - next.sale.price.y,
      ),
    };
  }

  if (overrides.strike) {
    next = {
      ...next,
      strike: { ...next.strike, x: overrides.strike.x, y: overrides.strike.y },
    };
  }

  return next;
};
