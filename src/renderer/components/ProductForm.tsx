import categories from "../../data/categories.json";
import { featureOptionsForCategory, isValidFeatureForCategory } from "../../shared/categoryFeatures";
import { unitForCategory } from "../../shared/categoryUnits";
import {
  PRODUCT_FIELD_LIMITS,
  clampText,
} from "../../shared/productFieldLimits";
import { clampDimensionValue } from "../../shared/sizeDisplay";
import { hasRemovedBackground } from "../../shared/productImage";
import type { ProductInput, ProductCategory } from "../../shared/types";

interface ProductFormProps {
  product: ProductInput;
  onChange: (next: ProductInput) => void;
  onPickProductImage: () => Promise<void>;
  onRemoveBackground: () => Promise<void>;
  onRevertBackground: () => void;
  backgroundRemovalBusy?: boolean;
  backgroundRemovalProgress?: number;
  backgroundRemovalLabel?: string;
}

const FieldCounter = ({ value, max }: { value: number; max: number }) => (
  <p className="mt-1 text-[10px] text-slate-500">
    {value} / {max}
  </p>
);

export function ProductForm({
  product,
  onChange,
  onPickProductImage,
  onRemoveBackground,
  onRevertBackground,
  backgroundRemovalBusy = false,
  backgroundRemovalProgress = 0,
  backgroundRemovalLabel = "",
}: ProductFormProps) {
  const featureOptions = featureOptionsForCategory(product.category);
  const selectedFeature = product.features[0] ?? "";

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
      features: keepFeature ? [currentFeature] : [],
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-orange-100 bg-white p-4 text-slate-800">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-700">Date produs</h2>

      <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="productName">Nume produs</label>
        <input
          id="productName"
          className="w-full rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-300"
          value={product.productName}
          maxLength={PRODUCT_FIELD_LIMITS.productName}
          onChange={(event) =>
            update("productName", clampText(event.target.value, PRODUCT_FIELD_LIMITS.productName))
          }
          placeholder="Marfil Bianco"
        />
        <FieldCounter value={product.productName.length} max={PRODUCT_FIELD_LIMITS.productName} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="category">Categorie</label>
        <select
          id="category"
          className="w-full rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-300"
          value={product.category}
          onChange={(event) => onCategoryChange(event.target.value as ProductCategory)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="price">Pret</label>
          <input
            id="price"
            className="w-full rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-300"
            type="number"
            min={0}
            max={PRODUCT_FIELD_LIMITS.priceMax}
            step="0.01"
            value={product.price || ""}
            onChange={(event) => {
              const nextPrice = Number(event.target.value);
              if (!Number.isFinite(nextPrice)) {
                update("price", 0);
                return;
              }
              update("price", Math.min(Math.max(nextPrice, 0), PRODUCT_FIELD_LIMITS.priceMax));
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="unit">Unitate</label>
          <input
            id="unit"
            readOnly
            tabIndex={-1}
            className="w-full cursor-default rounded-xl border border-orange-100 bg-slate-100/80 px-3 py-2 text-sm text-slate-600"
            value={product.unit}
            aria-label={`Unitate automată: ${product.unit}`}
          />
          <p className="mt-1 text-[10px] text-slate-500">Setată automat după categorie</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="feature">
          Caracteristici
        </label>
        {featureOptions.length > 0 ? (
          <select
            id="feature"
            className="w-full rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-300"
            value={selectedFeature}
            onChange={(event) =>
              update("features", event.target.value ? [event.target.value] : [])
            }
          >
            <option value="">Selecteaza caracteristica</option>
            {featureOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <p className="rounded-xl border border-orange-100 bg-slate-100/80 px-3 py-2 text-sm text-slate-500">
            Nu sunt optiuni definite pentru aceasta categorie.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="description">Descriere scurta</label>
        <textarea
          id="description"
          className="w-full rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-300"
          rows={2}
          maxLength={PRODUCT_FIELD_LIMITS.description}
          value={product.description}
          onChange={(event) =>
            update("description", clampText(event.target.value, PRODUCT_FIELD_LIMITS.description))
          }
        />
        <FieldCounter value={product.description.length} max={PRODUCT_FIELD_LIMITS.description} />
      </div>

      <div>
        <span className="mb-1 block text-xs font-semibold text-slate-600">Dimensiune</span>
        <div className="flex items-center gap-2">
          <input
            id="sizeWidth"
            className="w-full rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-300"
            inputMode="numeric"
            value={product.sizeWidth ?? ""}
            maxLength={PRODUCT_FIELD_LIMITS.sizeDimension}
            onChange={(event) => update("sizeWidth", clampDimensionValue(event.target.value))}
            placeholder="60"
            aria-label="Latime dimensiune"
          />
          <span className="shrink-0 text-sm font-bold text-slate-500" aria-hidden="true">
            x
          </span>
          <input
            id="sizeHeight"
            className="w-full rounded-xl border border-orange-100 bg-orange-50/30 px-3 py-2 text-sm outline-none focus:border-orange-300"
            inputMode="numeric"
            value={product.sizeHeight ?? ""}
            maxLength={PRODUCT_FIELD_LIMITS.sizeDimension}
            onChange={(event) => update("sizeHeight", clampDimensionValue(event.target.value))}
            placeholder="120"
            aria-label="Inaltime dimensiune"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-100"
            onClick={() => void onPickProductImage()}
          >
            Alege poza produs
          </button>
          <button
            type="button"
            className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void onRemoveBackground()}
            disabled={!product.productImagePath || backgroundRemovalBusy || hasRemovedBackground(product)}
          >
            {backgroundRemovalBusy ? "Se elimina fundalul..." : "Elimina fundalul"}
          </button>
          <button
            type="button"
            className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onRevertBackground}
            disabled={!hasRemovedBackground(product) || backgroundRemovalBusy}
          >
            Revino la original
          </button>
        </div>
        {backgroundRemovalBusy ? (
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-orange-100">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${backgroundRemovalProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {backgroundRemovalProgress}% {backgroundRemovalLabel ? `• ${backgroundRemovalLabel}` : ""}
            </p>
          </div>
        ) : null}
        <p className="truncate text-xs text-slate-500">
          {product.productImagePath
            ? hasRemovedBackground(product)
              ? "Poza produs (fundal eliminat)"
              : product.productImagePath
            : "Nicio poza selectata."}
        </p>
      </div>
    </div>
  );
}
