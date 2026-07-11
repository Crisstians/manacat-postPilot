import { X } from "lucide-react";
import type { ProductInput, TemplateLayout } from "../../shared/types";
import { PostCanvas } from "./konva/PostCanvas";

const THUMB_HEIGHT = 76;

interface PostDraftThumbnailProps {
  product: ProductInput;
  template: TemplateLayout;
  index: number;
  isActive: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onRemove?: () => void;
}

export function PostDraftThumbnail({
  product,
  template,
  index,
  isActive,
  canRemove,
  onSelect,
  onRemove,
}: PostDraftThumbnailProps) {
  const previewScale = THUMB_HEIGHT / template.height;
  const thumbWidth = Math.round(template.width * previewScale);
  const label = product.productName.trim() || `Postare ${index + 1}`;

  return (
    <div className="group relative shrink-0 p-1.5">
      <button
        type="button"
        onClick={onSelect}
        title={label}
        aria-label={label}
        aria-current={isActive ? "true" : undefined}
        className={`block overflow-hidden rounded-xl transition ${
          isActive
            ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-white/80 shadow-md shadow-orange-200/60"
            : "ring-1 ring-orange-100 opacity-80 hover:opacity-100 hover:ring-orange-300"
        }`}
        style={{ width: thumbWidth, height: THUMB_HEIGHT }}
      >
        <PostCanvas
          product={product}
          template={template}
          previewScale={previewScale}
          showProductPlaceholder={!product.productImagePath}
        />
      </button>

      {canRemove && isActive && onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-rose-200 bg-rose-500 text-white shadow-sm transition hover:bg-rose-600"
          aria-label={`Șterge ${label}`}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}

export const BULK_THUMB_HEIGHT = THUMB_HEIGHT;
