import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface UnsavedChangesModalProps {
  open: boolean;
  busy?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesModal({
  open,
  busy = false,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesModalProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="action-loading-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
    >
      <div className="action-loading-card relative w-full max-w-md overflow-hidden rounded-2xl border border-base-300/60 bg-base-100 shadow-2xl shadow-base-content/10">
        <div className="flex items-start justify-between gap-3 border-b border-base-300/60 px-5 py-4">
          <div className="min-w-0">
            <h2 id="unsaved-changes-title" className="text-lg font-bold text-base-content">
              Modificări nesalvate
            </h2>
            <p className="mt-1 text-sm text-base-content/55">
              Vrei să salvezi documentul înainte de a continua?
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onCancel}
            disabled={busy}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-base-300/60 px-5 py-3">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
            Anulează
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={onDiscard} disabled={busy}>
            Nu salva
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : null}
            Salvează
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
