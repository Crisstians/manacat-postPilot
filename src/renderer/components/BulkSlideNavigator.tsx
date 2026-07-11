import { Plus } from "lucide-react";
import type { PostDraft } from "../../shared/types";
import { MAX_BULK_POSTS } from "../../shared/types";
import { BULK_THUMB_HEIGHT, PostDraftThumbnail } from "./PostDraftThumbnail";

interface BulkSlideNavigatorProps {
  drafts: PostDraft[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function BulkSlideNavigator({
  drafts,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
}: BulkSlideNavigatorProps) {
  const activeDraft = drafts[activeIndex];
  const activeLabel = activeDraft?.product.productName.trim() || `Postare ${activeIndex + 1}`;
  const canAdd = drafts.length < MAX_BULK_POSTS;

  return (
    <div className="shrink-0 rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
          Lot postări ({drafts.length}/{MAX_BULK_POSTS})
        </p>
        <p className="truncate text-sm font-medium text-slate-700">{activeLabel}</p>
      </div>

      <div className="flex min-w-0 items-center gap-3 overflow-x-auto px-1.5 py-2">
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
          className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/80 text-orange-600 transition hover:border-orange-400 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ width: BULK_THUMB_HEIGHT, height: BULK_THUMB_HEIGHT }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Postarea {activeIndex + 1} din {drafts.length}
      </p>
    </div>
  );
}
