import { ChevronDown, ImagePlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import categories from "../../data/categories.json";
import { featureOptionsForCategory, isValidFeatureForCategory } from "../../shared/categoryFeatures";
import { unitForCategory } from "../../shared/categoryUnits";
import { EXPORT_REQUIREMENTS } from "../../shared/exportReadiness";
import {
  PRODUCT_FIELD_LIMITS,
  clampText,
} from "../../shared/productFieldLimits";
import { defaultSubtitleForCategory } from "../../shared/productSubtitle";
import { clampDimensionValue } from "../../shared/sizeDisplay";
import { getDisplayProductImagePath, hasRemovedBackground } from "../../shared/productImage";
import type { ProductInput, ProductCategory, TemplateLayout } from "../../shared/types";
import { resolveProductImageSource } from "../productImageSource";
import { FlyonAdvancedSelect } from "./FlyonAdvancedSelect";

interface ProductFormProps {
  product: ProductInput;
  template: TemplateLayout;
  onChange: (next: ProductInput) => void;
  onNavigateField?: (fieldKey: string) => void;
  onPickProductImage: () => Promise<void>;
  onProductImageFile?: (file: File) => void;
  onRemoveProductImage: () => void;
  showFieldHints?: boolean;
}

const FieldCounter = ({ value, max }: { value: number; max: number }) => (
  <p className="helper-text mt-1 text-[10px]">
    {value} / {max}
  </p>
);

const FormField = ({
  label,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <label className="label-text mb-1.5 block text-xs font-semibold" htmlFor={htmlFor}>
      {label}
    </label>
    {children}
  </div>
);

const FormSection = ({
  title,
  open,
  onToggle,
  complete,
  missingCount,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  complete: boolean;
  missingCount: number;
  children: ReactNode;
}) => (
  <section className="form-section overflow-hidden p-0">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-2 p-3 text-left transition hover:bg-base-200/40"
    >
      <span className="flex min-w-0 items-center gap-2">
        <ChevronDown
          size={14}
          className={`shrink-0 text-base-content/45 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        <span className="app-section-title">{title}</span>
      </span>
      {complete ? (
        <span className="badge badge-xs badge-soft badge-success shrink-0">Complet</span>
      ) : missingCount > 0 ? (
        <span className="badge badge-xs badge-soft badge-warning shrink-0">
          {missingCount} lipsă
        </span>
      ) : null}
    </button>
    {open ? <div className="space-y-3 border-t border-base-300/50 p-3">{children}</div> : null}
  </section>
);

type SectionId = "basic" | "details" | "image";

const SECTION_FIELD_KEYS: Record<SectionId, string[]> = {
  basic: ["name", "price"],
  details: ["description"],
  image: ["image"],
};

const REQUIRED_PROGRESS_FIELDS = EXPORT_REQUIREMENTS.filter((field) => field.key !== "background").map(
  (field) => ({
    key: field.key,
    label: field.label,
    check: (product: ProductInput, template: TemplateLayout) => field.check(product, template),
  }),
);

const fieldToSection = (fieldKey: string): SectionId | null => {
  if (fieldKey === "name" || fieldKey === "price") return "basic";
  if (fieldKey === "image") return "image";
  if (fieldKey === "description" || fieldKey === "feature" || fieldKey === "size" || fieldKey === "subtitle") {
    return "details";
  }
  return null;
};

const isSectionOpenByDefault = (
  sectionId: SectionId,
  product: ProductInput,
  template: TemplateLayout,
): boolean =>
  SECTION_FIELD_KEYS[sectionId].some(
    (key) => !REQUIRED_PROGRESS_FIELDS.find((field) => field.key === key)?.check(product, template),
  );

const FormProgress = ({
  product,
  template,
  onNavigateField,
}: {
  product: ProductInput;
  template: TemplateLayout;
  onNavigateField?: (fieldKey: string) => void;
}) => {
  const completedCount = useMemo(
    () => REQUIRED_PROGRESS_FIELDS.filter((field) => field.check(product, template)).length,
    [product, template],
  );
  const totalCount = REQUIRED_PROGRESS_FIELDS.length;
  const percent = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;
  const missingFields = useMemo(
    () => REQUIRED_PROGRESS_FIELDS.filter((field) => !field.check(product, template)),
    [product, template],
  );

  if (isComplete) {
    return (
      <div className="form-progress-compact flex items-center gap-2 text-xs text-success">
        <span className="badge badge-xs badge-soft badge-success">Gata export</span>
        <span className="text-base-content/60">Toate câmpurile obligatorii sunt completate.</span>
      </div>
    );
  }

  return (
    <div className="form-progress-compact space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="app-section-title">Progres export</p>
          <p className="text-[11px] text-base-content/50">
            {completedCount} din {totalCount} câmpuri obligatorii
          </p>
        </div>
        <span className="badge badge-xs badge-soft badge-primary shrink-0">
          {completedCount}/{totalCount}
        </span>
      </div>
      <div
        className="progress progress-primary h-1 w-full"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progres export ${completedCount} din ${totalCount}`}
      >
        <div className="progress-bar transition-all" style={{ width: `${percent}%` }} />
      </div>
      {missingFields.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          <span className="self-center text-[10px] text-base-content/45">Lipsesc:</span>
          {missingFields.map((field) =>
            onNavigateField ? (
              <button
                key={field.key}
                type="button"
                onClick={() => onNavigateField(field.key)}
                className="badge badge-xs badge-soft badge-warning cursor-pointer transition hover:opacity-80"
              >
                {field.label}
              </button>
            ) : (
              <span key={field.key} className="badge badge-xs badge-soft badge-warning">
                {field.label}
              </span>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
};

const categoryOptions = categories.map((category) => ({
  value: category.id,
  label: category.label,
}));

export function ProductForm({
  product,
  template,
  onChange,
  onNavigateField,
  onPickProductImage,
  onProductImageFile,
  onRemoveProductImage,
  showFieldHints = false,
}: ProductFormProps) {
  const [imageDragOver, setImageDragOver] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(() => ({
    basic: isSectionOpenByDefault("basic", product, template),
    details: isSectionOpenByDefault("details", product, template),
    image: isSectionOpenByDefault("image", product, template),
  }));

  const toggleSection = (sectionId: SectionId) => {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  };

  const sectionMissingCount = useCallback(
    (sectionId: SectionId) =>
      SECTION_FIELD_KEYS[sectionId].filter(
        (key) => !REQUIRED_PROGRESS_FIELDS.find((field) => field.key === key)?.check(product, template),
      ).length,
    [product, template],
  );

  const sectionComplete = (sectionId: SectionId) => sectionMissingCount(sectionId) === 0;

  const handleNavigateField = (fieldKey: string) => {
    const sectionId = fieldToSection(fieldKey);
    if (sectionId) {
      setOpenSections((current) => ({ ...current, [sectionId]: true }));
    }
    onNavigateField?.(fieldKey);
  };

  useEffect(() => {
    if (!showFieldHints) return;
    setOpenSections({
      basic: isSectionOpenByDefault("basic", product, template),
      details: isSectionOpenByDefault("details", product, template),
      image: isSectionOpenByDefault("image", product, template),
    });
  }, [showFieldHints, product, template]);

  const featureOptions = featureOptionsForCategory(product.category);
  const selectedFeature = product.features[0] ?? "";

  const missingClass = (isMissing: boolean) =>
    showFieldHints && isMissing ? "input-field-missing" : "";

  const update = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => {
    onChange({ ...product, [key]: value });
  };

  const onCategoryChange = (category: ProductCategory) => {
    const currentFeature = product.features[0] ?? "";
    const keepFeature = currentFeature && isValidFeatureForCategory(category, currentFeature);

    onChange({
      ...product,
      category,
      unit: unitForCategory(category),
      subtitle: defaultSubtitleForCategory(category),
      features: keepFeature ? [currentFeature] : [],
    });
  };

  const acceptImageFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (onProductImageFile) {
      onProductImageFile(file);
      return;
    }
    void onPickProductImage();
  };

  const onImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setImageDragOver(true);
  };

  const onImageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setImageDragOver(false);
  };

  const onImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setImageDragOver(false);
    acceptImageFile(event.dataTransfer.files[0]);
  };

  const featureSelectOptions = [
    { value: "", label: "Selectează caracteristica" },
    ...featureOptions.map((option) => ({ value: option, label: option })),
  ];

  const imageStatus = product.productImagePath
    ? hasRemovedBackground(product)
      ? "Poză produs (fundal eliminat)"
      : "Poză produs selectată"
    : "Nicio poză selectată.";
  const displayImagePath = getDisplayProductImagePath(product);

  return (
    <div className="space-y-3 text-base-content">
      <FormProgress product={product} template={template} onNavigateField={handleNavigateField} />

      <FormSection
        title="Informații de bază"
        open={openSections.basic}
        onToggle={() => toggleSection("basic")}
        complete={sectionComplete("basic")}
        missingCount={sectionMissingCount("basic")}
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nume produs" htmlFor="productName">
            <input
              id="productName"
              className={`input input-sm w-full ${missingClass(!product.productName.trim())}`}
              value={product.productName}
              maxLength={PRODUCT_FIELD_LIMITS.productName}
              onChange={(event) =>
                update("productName", clampText(event.target.value, PRODUCT_FIELD_LIMITS.productName))
              }
              placeholder="ex. Marfil Bianco"
            />
            <FieldCounter value={product.productName.length} max={PRODUCT_FIELD_LIMITS.productName} />
          </FormField>

          <FormField label="Categorie" htmlFor="category">
            <FlyonAdvancedSelect
              id="category"
              value={product.category}
              onChange={(next) => onCategoryChange(next as ProductCategory)}
              options={categoryOptions}
              placeholder="Alege categoria"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Unitate" htmlFor="unit">
            <input
              id="unit"
              readOnly
              tabIndex={-1}
              className="input input-sm w-full cursor-default bg-base-200/50 text-base-content/70"
              value={product.unit}
              aria-label={`Unitate automată: ${product.unit}`}
            />
            <p className="helper-text mt-1 text-[10px]">Setată automat după categorie</p>
          </FormField>

          <FormField label="Etichete" htmlFor="hasDiscount">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="hasDiscount"
                className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-base-300/80 bg-base-100 px-3 text-sm"
              >
                <input
                  id="hasDiscount"
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={Boolean(product.hasDiscount)}
                  onChange={(event) => {
                    const hasDiscount = event.target.checked;
                    onChange({
                      ...product,
                      hasDiscount,
                      originalPrice: hasDiscount ? product.originalPrice : 0,
                    });
                  }}
                />
                <span>Preț redus</span>
              </label>
              <label
                htmlFor="hasNewProduct"
                className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-base-300/80 bg-base-100 px-3 text-sm"
              >
                <input
                  id="hasNewProduct"
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={Boolean(product.hasNewProduct)}
                  onChange={(event) => update("hasNewProduct", event.target.checked)}
                />
                <span>Produs nou</span>
              </label>
            </div>
          </FormField>
        </div>

        {product.hasDiscount ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Preț înainte" htmlFor="originalPrice">
              <input
                id="originalPrice"
                className={`input input-sm w-full ${missingClass(
                  product.originalPrice <= 0 ||
                    (product.price > 0 && product.originalPrice <= product.price),
                )}`}
                type="number"
                min={0}
                max={PRODUCT_FIELD_LIMITS.priceMax}
                step="0.01"
                value={product.originalPrice || ""}
                placeholder="ex. 69.99"
                onChange={(event) => {
                  const nextPrice = Number(event.target.value);
                  if (!Number.isFinite(nextPrice)) {
                    update("originalPrice", 0);
                    return;
                  }
                  update(
                    "originalPrice",
                    Math.min(Math.max(nextPrice, 0), PRODUCT_FIELD_LIMITS.priceMax),
                  );
                }}
              />
              {product.originalPrice > 0 &&
              product.price > 0 &&
              product.originalPrice <= product.price ? (
                <p className="helper-text mt-1 text-[10px] text-error">
                  Trebuie să fie mai mare decât prețul redus
                </p>
              ) : null}
            </FormField>

            <FormField label="Preț după reducere" htmlFor="price">
              <input
                id="price"
                className={`input input-sm w-full ${missingClass(product.price <= 0)}`}
                type="number"
                min={0}
                max={PRODUCT_FIELD_LIMITS.priceMax}
                step="0.01"
                value={product.price || ""}
                placeholder="ex. 49.99"
                onChange={(event) => {
                  const nextPrice = Number(event.target.value);
                  if (!Number.isFinite(nextPrice)) {
                    update("price", 0);
                    return;
                  }
                  update("price", Math.min(Math.max(nextPrice, 0), PRODUCT_FIELD_LIMITS.priceMax));
                }}
              />
            </FormField>
          </div>
        ) : (
          <FormField label="Preț" htmlFor="price">
            <input
              id="price"
              className={`input input-sm w-full ${missingClass(product.price <= 0)}`}
              type="number"
              min={0}
              max={PRODUCT_FIELD_LIMITS.priceMax}
              step="0.01"
              value={product.price || ""}
              placeholder="ex. 50.50"
              onChange={(event) => {
                const nextPrice = Number(event.target.value);
                if (!Number.isFinite(nextPrice)) {
                  update("price", 0);
                  return;
                }
                update("price", Math.min(Math.max(nextPrice, 0), PRODUCT_FIELD_LIMITS.priceMax));
              }}
            />
          </FormField>
        )}
      </FormSection>

      <FormSection
        title="Detalii produs"
        open={openSections.details}
        onToggle={() => toggleSection("details")}
        complete={sectionComplete("details")}
        missingCount={sectionMissingCount("details")}
      >
        <FormField label="Subtitlu graphic" htmlFor="subtitle">
          <textarea
            id="subtitle"
            className="textarea textarea-sm w-full"
            rows={2}
            maxLength={PRODUCT_FIELD_LIMITS.subtitle}
            value={product.subtitle}
            onChange={(event) =>
              update("subtitle", clampText(event.target.value, PRODUCT_FIELD_LIMITS.subtitle))
            }
            placeholder="Placă ceramică (linia 1)"
          />
          <FieldCounter value={product.subtitle.length} max={PRODUCT_FIELD_LIMITS.subtitle} />
          <p className="helper-text mt-1 text-[10px]">Apare pe graphic sub numele produsului. Enter = linie nouă.</p>
        </FormField>

        <FormField label="Caracteristici" htmlFor="feature">
          {featureOptions.length > 0 ? (
            <FlyonAdvancedSelect
              id="feature"
              value={selectedFeature}
              onChange={(next) => update("features", next ? [next] : [])}
              options={featureSelectOptions}
              placeholder="Selectează caracteristica"
              searchable
            />
          ) : (
            <div className="input input-sm flex w-full cursor-default items-center text-sm text-base-content/60">
              Nu sunt opțiuni definite pentru această categorie.
            </div>
          )}
        </FormField>

        <FormField label="Descriere scurtă" htmlFor="description">
          <textarea
            id="description"
            className={`textarea textarea-sm w-full ${missingClass(!product.description.trim())}`}
            rows={2}
            maxLength={PRODUCT_FIELD_LIMITS.description}
            value={product.description}
            onChange={(event) =>
              update("description", clampText(event.target.value, PRODUCT_FIELD_LIMITS.description))
            }
            placeholder="Descrie produsul pe scurt..."
          />
          <FieldCounter value={product.description.length} max={PRODUCT_FIELD_LIMITS.description} />
        </FormField>

        <FormField label="Dimensiune">
          <div className="join w-full">
            <input
              id="sizeWidth"
              className="input input-sm join-item w-full"
              inputMode="numeric"
              value={product.sizeWidth ?? ""}
              maxLength={PRODUCT_FIELD_LIMITS.sizeDimension}
              onChange={(event) => update("sizeWidth", clampDimensionValue(event.target.value))}
              placeholder="60"
              aria-label="Lățime dimensiune"
            />
            <span
              className="join-item flex w-10 items-center justify-center border border-base-300/80 bg-base-200/80 text-sm font-semibold text-base-content/45"
              aria-hidden="true"
            >
              ×
            </span>
            <input
              id="sizeHeight"
              className="input input-sm join-item w-full"
              inputMode="numeric"
              value={product.sizeHeight ?? ""}
              maxLength={PRODUCT_FIELD_LIMITS.sizeDimension}
              onChange={(event) => update("sizeHeight", clampDimensionValue(event.target.value))}
              placeholder="120"
              aria-label="Înălțime dimensiune"
            />
          </div>
        </FormField>
      </FormSection>

      <FormSection
        title="Imagine produs"
        open={openSections.image}
        onToggle={() => toggleSection("image")}
        complete={sectionComplete("image")}
        missingCount={sectionMissingCount("image")}
      >
        <div
          id="product-image-section"
          className={`space-y-3 rounded-xl transition ${
            showFieldHints && !product.productImagePath ? "ring-1 ring-warning/40" : ""
          } ${imageDragOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
          onDragOver={onImageDragOver}
          onDragLeave={onImageDragLeave}
          onDrop={onImageDrop}
        >
          {displayImagePath ? (
            <div className="relative mx-auto max-w-[180px]">
              <button
                type="button"
                onClick={() => void onPickProductImage()}
                className="image-preview-thumb block w-full cursor-pointer transition hover:ring-2 hover:ring-primary/30"
                title="Schimbă poza produsului"
              >
                <img
                  src={resolveProductImageSource(displayImagePath)}
                  alt="Previzualizare poză produs"
                  className="aspect-square w-full object-contain p-2"
                />
                {hasRemovedBackground(product) ? (
                  <span className="absolute left-2 top-2 badge badge-xs badge-soft badge-success">
                    Fără fundal
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={onRemoveProductImage}
                className="btn btn-error btn-circle absolute -right-1.5 -top-1.5 h-6 min-h-0 w-6 p-0 shadow-sm"
                aria-label="Elimină poza produsului"
                title="Elimină poza"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void onPickProductImage()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-base-300/70 bg-base-200/30 px-4 py-6 text-base-content/55 transition hover:border-primary/40 hover:bg-base-200/50 hover:text-base-content/70"
            >
              <ImagePlus size={24} className="text-primary/70" />
              <span className="text-xs font-medium">Apasă sau trage poza produsului aici</span>
            </button>
          )}

          <p className="helper-text truncate text-xs">{imageStatus}</p>
        </div>
      </FormSection>
    </div>
  );
}
