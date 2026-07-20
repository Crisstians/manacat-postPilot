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
        className={`card block overflow-hidden border transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 ${
          isActive
            ? "scale-[1.02] border-primary shadow-md shadow-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-base-100"
            : "border-base-300/80 opacity-85 hover:scale-[1.03] hover:border-primary/50 hover:opacity-100 hover:shadow-md hover:shadow-base-content/10"
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
          className="btn btn-error btn-circle absolute -right-0.5 -top-0.5 z-10 h-5 min-h-0 w-5 p-0 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label={`Șterge ${label}`}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}

export const BULK_THUMB_HEIGHT = THUMB_HEIGHT;
