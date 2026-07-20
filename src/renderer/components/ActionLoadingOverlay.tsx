import { createPortal } from "react-dom";
import { Download, Share2 } from "lucide-react";
import logo from "../../assets/logo.png";

export type ActionLoadingVariant = "export" | "publish";

export interface ActionLoadingState {
  variant: ActionLoadingVariant;
  stepIndex: number;
  detail?: string;
  progress?: number;
}

const EXPORT_STEPS = ["Pregătim datele", "Compunem graphic-ul", "Salvăm imaginea"] as const;
const PUBLISH_STEPS = ["Randăm imaginea", "Pregătim caption-ul", "Trimitem pe Facebook"] as const;

interface ActionLoadingOverlayProps {
  state: ActionLoadingState | null;
}

export function ActionLoadingOverlay({ state }: ActionLoadingOverlayProps) {
  if (!state) return null;

  const steps = state.variant === "export" ? EXPORT_STEPS : PUBLISH_STEPS;
  const title = state.variant === "export" ? "Export imagine" : "Publicare Facebook";
  const Icon = state.variant === "export" ? Download : Share2;
  const accentClass = state.variant === "export" ? "text-primary" : "text-info";
  const progress = Math.min(100, Math.max(0, state.progress ?? ((state.stepIndex + 1) / steps.length) * 100));

  return createPortal(
    <div
      className="action-loading-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={title}
    >
      <div className="action-loading-card relative w-full max-w-md overflow-hidden rounded-2xl border border-base-300/60 bg-base-100 p-6 shadow-2xl shadow-base-content/10">
        <div className="action-loading-glow pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="action-loading-glow pointer-events-none absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-info/10 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          <div className="action-loading-orbit relative mb-5 flex h-24 w-24 items-center justify-center">
            <span className="action-loading-ring action-loading-ring-outer absolute inset-0 rounded-full border-2 border-dashed border-primary/25" />
            <span className="action-loading-ring action-loading-ring-inner absolute inset-2 rounded-full border border-primary/35" />
            <span className="action-loading-dot action-loading-dot-a absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-primary" />
            <span className="action-loading-dot action-loading-dot-b absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-info/80" />
            <div className="action-loading-logo relative flex h-14 w-14 items-center justify-center rounded-2xl bg-base-200/80 p-2 shadow-inner">
              <img src={logo} alt="" className="h-full w-full object-contain" aria-hidden="true" />
            </div>
          </div>

          <div className={`mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${accentClass}`}>
            <Icon size={14} aria-hidden="true" />
            {title}
          </div>

          <p className="action-loading-title text-lg font-bold text-base-content" aria-live="polite">
            {steps[state.stepIndex] ?? steps[steps.length - 1]}
          </p>

          {state.detail ? (
            <p className="mt-1 text-sm text-base-content/55">{state.detail}</p>
          ) : (
            <p className="mt-1 text-sm text-base-content/45">Un moment, te rugăm...</p>
          )}

          <div className="mt-5 w-full">
            <div className="mb-2 flex items-center justify-between text-[11px] text-base-content/45">
              <span>Progres</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="action-loading-progress-track h-2 overflow-hidden rounded-full bg-base-200">
              <div
                className={`action-loading-progress-bar h-full rounded-full ${
                  state.variant === "export" ? "bg-primary" : "bg-info"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
