import { Copy, Plus } from "lucide-react";
import type { PostDraft } from "../../shared/types";
import { MAX_BULK_POSTS } from "../../shared/types";
import { BULK_THUMB_HEIGHT, PostDraftThumbnail } from "./PostDraftThumbnail";

interface BulkSlideNavigatorProps {
  drafts: PostDraft[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: (index: number) => void;
}

export function BulkSlideNavigator({
  drafts,
  activeIndex,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
}: BulkSlideNavigatorProps) {
  const activeDraft = drafts[activeIndex];
  const activeLabel = activeDraft?.product.productName.trim() || `Postare ${activeIndex + 1}`;
  const canAdd = drafts.length < MAX_BULK_POSTS;
  const isSinglePost = drafts.length === 1;

  if (isSinglePost) {
    return (
      <div className="shrink-0 border-b border-base-300/60 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="app-section-title">Postare curentă</p>
            <p className="truncate text-sm font-medium text-base-content/80">{activeLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDuplicate}
              disabled={!canAdd}
              title={canAdd ? "Duplică postarea curentă" : `Maxim ${MAX_BULK_POSTS} postări`}
              className="btn btn-outline btn-primary btn-sm"
            >
              <Copy size={16} />
              Duplică
            </button>
            <button
              type="button"
              onClick={onAdd}
              disabled={!canAdd}
              title={canAdd ? "Adaugă postare în lot" : `Maxim ${MAX_BULK_POSTS} postări`}
              className="btn btn-outline btn-primary btn-sm border-dashed"
            >
              <Plus size={16} />
              Lot postări
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-base-300/60 pb-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="app-section-title text-primary">
          Lot postări ({drafts.length}/{MAX_BULK_POSTS})
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-medium text-base-content/75">{activeLabel}</p>
          <button
            type="button"
            onClick={onDuplicate}
            disabled={!canAdd}
            title={canAdd ? "Duplică postarea activă" : `Maxim ${MAX_BULK_POSTS} postări`}
            className="btn btn-outline btn-primary btn-xs shrink-0"
          >
            <Copy size={14} />
            Duplică
          </button>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 overflow-x-auto px-1 py-1">
        {drafts.map((draft, index) => (
          <PostDraftThumbnail
            key={draft.id}
            product={draft.product}
            template={draft.template}
            index={index}
            isActive={index === activeIndex}
            canRemove={drafts.length > 1}
            onSelect={() => onSelect(index)}
            onRemove={() => onRemove(index)}
          />
        ))}

        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          title={canAdd ? "Adaugă postare nouă" : `Maxim ${MAX_BULK_POSTS} postări`}
          aria-label="Adaugă postare nouă"
          className="btn btn-outline btn-primary btn-square shrink-0 border-dashed transition-all duration-200 hover:scale-105 hover:shadow-md disabled:opacity-40 disabled:hover:scale-100"
          style={{ width: BULK_THUMB_HEIGHT, height: BULK_THUMB_HEIGHT }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
