import { createPortal } from "react-dom";
import { Download, FolderOpen, X } from "lucide-react";
import type { BulkExportMode } from "../../shared/types";

interface ExportBulkMethodModalProps {
  open: boolean;
  postCount: number;
  onCancel: () => void;
  onSelect: (mode: BulkExportMode) => void;
}

export function ExportBulkMethodModal({
  open,
  postCount,
  onCancel,
  onSelect,
}: ExportBulkMethodModalProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="action-loading-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-bulk-method-title"
    >
      <div className="action-loading-card relative w-full max-w-md overflow-hidden rounded-2xl border border-base-300/60 bg-base-100 shadow-2xl shadow-base-content/10">
        <div className="flex items-start justify-between gap-3 border-b border-base-300/60 px-5 py-4">
          <div className="min-w-0">
            <h2 id="export-bulk-method-title" className="text-lg font-bold text-base-content">
              Export lot — {postCount} postări
            </h2>
            <p className="mt-1 text-sm text-base-content/55">
              Alege cum vrei să salvezi imaginile PNG și captioanele .txt.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onCancel}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <button
            type="button"
            className="btn btn-outline btn-block h-auto min-h-0 justify-start gap-3 px-4 py-3 text-left"
            onClick={() => onSelect("folder")}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderOpen size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-base-content">
                Salvează în folder
              </span>
              <span className="mt-0.5 block text-xs font-normal text-base-content/55">
                Alegi un folder și se scriu toate fișierele acolo
              </span>
            </span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-block h-auto min-h-0 justify-start gap-3 px-4 py-3 text-left"
            onClick={() => onSelect("zip")}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
              <Download size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-base-content">Descarcă ZIP</span>
              <span className="mt-0.5 block text-xs font-normal text-base-content/55">
                Un singur arhivă cu toate PNG-urile și captioanele
              </span>
            </span>
          </button>
        </div>

        <div className="flex justify-end border-t border-base-300/60 px-5 py-3">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Anulează
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
