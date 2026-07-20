import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Share2, X } from "lucide-react";

export interface PublishChecklistItem {
  id: string;
  label: string;
}

interface PublishConfirmModalProps {
  open: boolean;
  title?: string;
  caption: string;
  checklist: PublishChecklistItem[];
  /** URL(s) preview — blob: sau data: */
  previewUrls: string[];
  previewLoading?: boolean;
  confirmBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PublishConfirmModal({
  open,
  title = "Confirmă publicarea pe Facebook",
  caption,
  checklist,
  previewUrls,
  previewLoading = false,
  confirmBusy = false,
  onCancel,
  onConfirm,
}: PublishConfirmModalProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, boolean> = {};
    for (const item of checklist) {
      initial[item.id] = false;
    }
    setChecked(initial);
  }, [open, checklist]);

  const allChecked = useMemo(
    () => checklist.length > 0 && checklist.every((item) => checked[item.id]),
    [checklist, checked],
  );

  if (!open) return null;

  return createPortal(
    <div
      className="action-loading-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-confirm-title"
    >
      <div className="action-loading-card relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-base-300/60 bg-base-100 shadow-2xl shadow-base-content/10">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-base-300/60 px-5 py-4">
          <div className="min-w-0">
            <h2 id="publish-confirm-title" className="text-lg font-bold text-base-content">
              {title}
            </h2>
            <p className="mt-1 text-sm text-base-content/55">
              Verifică preview-ul și bifează fiecare secțiune. După publicare nu mai poți edita
              postarea din aplicație.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onCancel}
            disabled={confirmBusy}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                Preview graphic
              </p>
              <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-base-300/60 bg-base-200/80 p-3">
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-base-content/55">
                    <span className="loading loading-spinner loading-sm text-info" />
                    Generăm preview-ul...
                  </div>
                ) : previewUrls.length === 0 ? (
                  <p className="text-sm text-base-content/50">Preview indisponibil.</p>
                ) : (
                  <div className="flex max-h-[52vh] w-full flex-col gap-3 overflow-y-auto">
                    {previewUrls.map((url, index) => (
                      <img
                        key={`${url}-${index}`}
                        src={url}
                        alt={`Preview postare ${index + 1}`}
                        className="mx-auto max-h-[48vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-base-content/50">
                  Caption Facebook
                </p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-base-300/60 bg-base-200/50 p-3 text-xs leading-relaxed text-base-content/80">
                  {caption.trim() || "—"}
                </pre>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                Confirmări obligatorii
              </p>
              <ul className="space-y-2">
                {checklist.map((item) => {
                  const isOn = Boolean(checked[item.id]);
                  return (
                    <li key={item.id}>
                      <label
                        htmlFor={`publish-check-${item.id}`}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                          isOn
                            ? "border-success/40 bg-success/10"
                            : "border-base-300/80 bg-base-100 hover:border-base-content/20"
                        }`}
                      >
                        <input
                          id={`publish-check-${item.id}`}
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-success mt-0.5"
                          checked={isOn}
                          disabled={confirmBusy}
                          onChange={(event) =>
                            setChecked((previous) => ({
                              ...previous,
                              [item.id]: event.target.checked,
                            }))
                          }
                        />
                        <span className="leading-snug text-base-content/85">{item.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {!allChecked ? (
                <p className="text-xs text-warning">
                  Bifează toate casutele pentru a putea publica.
                </p>
              ) : (
                <p className="text-xs text-success">
                  Totul e confirmat. Poți publica pe Facebook.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-base-300/60 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            disabled={confirmBusy}
          >
            Anulează
          </button>
          <button
            type="button"
            className="btn btn-info btn-sm gap-2"
            disabled={!allChecked || confirmBusy || previewLoading}
            onClick={onConfirm}
          >
            {confirmBusy ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Se publică...
              </>
            ) : (
              <>
                <Share2 size={16} />
                Confirmă și publică
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const PRODUCT_PUBLISH_CHECKLIST: PublishChecklistItem[] = [
  {
    id: "basic",
    label: "Informațiile de bază (nume, categorie, preț / etichete) sunt corecte",
  },
  {
    id: "details",
    label: "Detaliile produsului (subtitlu, caracteristică, descriere, dimensiune) sunt corecte",
  },
  {
    id: "image",
    label: "Poza produsului este corectă",
  },
  {
    id: "template",
    label: "Fundalul / template-ul este corect",
  },
  {
    id: "caption",
    label: "Caption-ul Facebook este corect",
  },
  {
    id: "preview",
    label: "Preview-ul graphic arată cum trebuie",
  },
];

export const BULK_PUBLISH_CHECKLIST: PublishChecklistItem[] = [
  {
    id: "posts",
    label: "Toate postările din lot au informațiile corecte",
  },
  {
    id: "images",
    label: "Pozele produselor din lot sunt corecte",
  },
  {
    id: "templates",
    label: "Fundalurile / template-urile din lot sunt corecte",
  },
  {
    id: "caption",
    label: "Caption-ul de lot pentru Facebook este corect",
  },
  {
    id: "preview",
    label: "Preview-urile din lot arată cum trebuie",
  },
];

export const ANNOUNCEMENT_PUBLISH_CHECKLIST: PublishChecklistItem[] = [
  {
    id: "content",
    label: "Textul anunțului este corect",
  },
  {
    id: "template",
    label: "Fundalul / template-ul este corect",
  },
  {
    id: "caption",
    label: "Caption-ul Facebook este corect",
  },
  {
    id: "preview",
    label: "Preview-ul graphic arată cum trebuie",
  },
];
