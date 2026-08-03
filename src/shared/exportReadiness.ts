import type { ProductInput, TemplateLayout } from "./types";
import { categoryUsesSize } from "./categoryLayout";

type ReadinessCheck = (product: ProductInput, template: TemplateLayout) => boolean;

export const EXPORT_REQUIREMENTS: ReadonlyArray<{
  key: string;
  label: string;
  check: ReadinessCheck;
}> = [
  {
    key: "name",
    label: "Nume",
    check: (product) => Boolean(product.productName.trim()),
  },
  {
    key: "price",
    label: "Preț",
    check: (product) => {
      if (product.price <= 0) return false;
      if (!product.hasDiscount) return true;
      return product.originalPrice > 0 && product.originalPrice > product.price;
    },
  },
  {
    key: "image",
    label: "Poză",
    check: (product) => Boolean(product.productImagePath),
  },
  {
    key: "description",
    label: "Descriere",
    check: (product) => Boolean(product.description.trim()),
  },
  {
    key: "background",
    label: "Fundal",
    check: (_product, template) => Boolean(template.backgroundImagePath),
  },
];

export const OPTIONAL_FORM_FIELDS = [
  {
    key: "feature",
    label: "Caracteristică",
    check: (product: ProductInput) => Boolean(product.features[0]),
  },
  {
    key: "size",
    label: "Dimensiune",
    check: (product: ProductInput) =>
      categoryUsesSize(product.category) && Boolean(product.sizeWidth && product.sizeHeight),
  },
] as const;

export function getMissingExportLabels(product: ProductInput, template: TemplateLayout): string[] {
  return EXPORT_REQUIREMENTS.filter((field) => !field.check(product, template)).map(
    (field) => field.label.toLowerCase(),
  );
}

export function isExportReady(product: ProductInput, template: TemplateLayout): boolean {
  return getMissingExportLabels(product, template).length === 0;
}

export type EditorPanel = "product" | "template";

export const FIELD_NAVIGATION: Record<
  string,
  { panel: EditorPanel; elementId: string }
> = {
  name: { panel: "product", elementId: "productName" },
  price: { panel: "product", elementId: "price" },
  image: { panel: "product", elementId: "product-image-section" },
  description: { panel: "product", elementId: "description" },
  feature: { panel: "product", elementId: "feature" },
  size: { panel: "product", elementId: "sizeWidth" },
  background: { panel: "template", elementId: "template-picker" },
};

export function getProductPanelIncomplete(product: ProductInput): boolean {
  return EXPORT_REQUIREMENTS.some(
    (field) => field.key !== "background" && !field.check(product, {} as TemplateLayout),
  );
}

export function getTemplatePanelIncomplete(template: TemplateLayout): boolean {
  return !EXPORT_REQUIREMENTS.find((field) => field.key === "background")!.check(
    {} as ProductInput,
    template,
  );
}

export function countProductRequiredMissing(product: ProductInput): number {
  return EXPORT_REQUIREMENTS.filter(
    (field) => field.key !== "background" && !field.check(product, {} as TemplateLayout),
  ).length;
}
