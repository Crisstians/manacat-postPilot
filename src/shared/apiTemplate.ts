import { normalizeTemplateLayout } from "./textBlockLayout";
import type { TemplateLayout } from "./types";

export type ApiTemplateKind = "product" | "announcement" | "both";

/** Layout stored on API (no backgroundImagePath). */
export interface ApiTemplateLayout {
  id: string;
  name: string;
  width: number;
  height: number;
  productLayer: TemplateLayout["productLayer"];
  textBlocks: TemplateLayout["textBlocks"];
}

export interface ApiTemplateListItem {
  id: string;
  name: string;
  slug: string;
  kind: ApiTemplateKind;
  width: number;
  height: number;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface ApiTemplateDetail extends ApiTemplateListItem {
  imageKey: string;
  layout: ApiTemplateLayout;
  createdByUserId: string | null;
  createdAt: string;
}

export interface ListTemplatesResponse {
  items: ApiTemplateListItem[];
  total: number;
  page: number;
  limit: number;
}

/** Maps API detail → editor TemplateLayout (imageUrl → backgroundImagePath). */
export const templateLayoutFromApi = (detail: ApiTemplateDetail): TemplateLayout =>
  normalizeTemplateLayout({
    id: detail.id,
    name: detail.name,
    width: detail.layout.width || detail.width,
    height: detail.layout.height || detail.height,
    backgroundImagePath: detail.imageUrl,
    productLayer: detail.layout.productLayer,
    textBlocks: detail.layout.textBlocks,
  });

/** Payload for POST/PATCH `layout` field (strip local background path). */
export const layoutPayloadForApi = (template: TemplateLayout): ApiTemplateLayout => ({
  id: template.id,
  name: template.name,
  width: template.width,
  height: template.height,
  productLayer: template.productLayer,
  textBlocks: template.textBlocks,
});

/** CUID-like / UUID ids from API (vs local `manacat-default`). */
export const looksLikeApiTemplateId = (id: string): boolean =>
  Boolean(id) && id !== "manacat-default" && !id.startsWith("announcement-") && id.length >= 20;
