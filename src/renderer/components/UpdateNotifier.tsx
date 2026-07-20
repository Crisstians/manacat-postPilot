import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCw, Rocket } from "lucide-react";
import logo from "../../assets/logo.png";
import type { UpdateStatus } from "../../shared/types";

const isUpdateBusy = (status: UpdateStatus): boolean =>
  status.phase === "checking" || status.phase === "downloading" || status.phase === "available";

function UpdateInstallOverlay({ version }: { version: string }) {
  return createPortal(
    <div
      className="action-loading-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="Se instalează actualizarea"
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

          <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Rocket size={14} aria-hidden="true" />
            Actualizare
          </div>

          <p className="action-loading-title text-lg font-bold text-base-content" aria-live="polite">
            Se instalează v{version}
          </p>
          <p className="mt-1 text-sm text-base-content/55">
            Aplicația se va reporni automat. Nu o închide.
          </p>

          <div className="mt-5 flex w-full items-center justify-center gap-2 text-sm text-base-content/60">
            <span className="loading loading-spinner loading-sm text-primary" />
            Pregătim instalarea...
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function UpdateReadyModal({
  version,
  installing,
  onInstall,
  onLater,
}: {
  version: string;
  installing: boolean;
  onInstall: () => void;
  onLater: () => void;
}) {
  return createPortal(
    <div
      className="action-loading-backdrop fixed inset-0 z-[150] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-ready-title"
    >
      <div className="action-loading-card relative w-full max-w-md overflow-hidden rounded-2xl border border-base-300/60 bg-base-100 p-6 shadow-2xl shadow-base-content/10">
        <div className="action-loading-glow pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <RefreshCw size={26} aria-hidden="true" />
          </div>

          <h2 id="update-ready-title" className="text-lg font-bold text-base-content">
            Actualizare gata de instalare
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-base-content/60">
            Versiunea <span className="font-semibold text-base-content">v{version}</span> a fost
            descărcată. Repornește aplicația pentru a o instala.
          </p>

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              className="btn btn-primary btn-sm flex-1 gap-2"
              disabled={installing}
              onClick={onInstall}
            >
              {installing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Rocket size={15} aria-hidden="true" />
              )}
              Repornește acum
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              disabled={installing}
              onClick={onLater}
            >
              Mai târziu
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function UpdateBanner({
  status,
  onInstall,
}: {
  status: UpdateStatus;
  onInstall?: () => void;
}) {
  if (status.phase === "not-available" || status.phase === "installing") {
    return null;
  }

  const isError = status.phase === "error";
  const isDownloaded = status.phase === "downloaded";
  const busy = isUpdateBusy(status);
  const percent = status.phase === "downloading" ? status.percent : status.phase === "available" ? 0 : null;

  let message = "";
  switch (status.phase) {
    case "checking":
      message = "Se verifică actualizări...";
      break;
    case "available":
      message = `Actualizare disponibilă (v${status.version}). Se descarcă...`;
      break;
    case "downloading":
      message = `Se descarcă actualizarea... ${status.percent}%`;
      break;
    case "downloaded":
      message = `Actualizare descărcată (v${status.version}).`;
      break;
    case "error":
      message = `Actualizare eșuată: ${status.message}`;
      break;
  }

  return (
    <div
      className={`alert flex flex-col gap-2 rounded-none border-b py-2.5 text-sm font-medium ${
        isError
          ? "alert-soft alert-error border-error/30"
          : isDownloaded
            ? "alert-soft alert-success border-success/30"
            : "alert-soft alert-warning border-warning/30"
      }`}
      role="status"
    >
      <div className="flex w-full items-center justify-center gap-2">
        {busy ? (
          <span className="loading loading-spinner loading-xs text-warning" />
        ) : isDownloaded ? (
          <Download size={14} className="text-success" aria-hidden="true" />
        ) : null}
        <span>{message}</span>
        {isDownloaded && onInstall ? (
          <button type="button" className="btn btn-success btn-xs ml-2 gap-1" onClick={onInstall}>
            <Rocket size={12} aria-hidden="true" />
            Instalează
          </button>
        ) : null}
      </div>
      {percent !== null ? (
        <div className="mx-auto h-1.5 w-full max-w-md overflow-hidden rounded-full bg-base-content/10">
          <div
            className="h-full rounded-full bg-warning transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function UpdateNotifier() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [dismissedReady, setDismissedReady] = useState(false);
  const [installingLocal, setInstallingLocal] = useState(false);

  useEffect(() => {
    const unsubscribe = window.manacatApi?.onUpdateStatus?.((status) => {
      setUpdateStatus(status);
      if (status.phase === "downloaded") {
        setDismissedReady(false);
      }
      if (status.phase === "installing") {
        setInstallingLocal(true);
      }
    });
    return () => unsubscribe?.();
  }, []);

  const requestInstall = async () => {
    if (installingLocal) return;
    setInstallingLocal(true);

    const version =
      updateStatus?.phase === "downloaded" || updateStatus?.phase === "installing"
        ? updateStatus.version
        : "nouă";
    setUpdateStatus({ phase: "installing", version });

    try {
      const result = await window.manacatApi?.installUpdate?.();
      if (result && !result.ok) {
        setInstallingLocal(false);
        setUpdateStatus({
          phase: "error",
          message: result.error ?? "Nu s-a putut porni instalarea.",
        });
      }
    } catch (error) {
      setInstallingLocal(false);
      setUpdateStatus({
        phase: "error",
        message: error instanceof Error ? error.message : "Nu s-a putut porni instalarea.",
      });
    }
  };

  if (!updateStatus) {
    return null;
  }

  const showReadyModal =
    updateStatus.phase === "downloaded" && !dismissedReady && !installingLocal;
  const installVersion =
    updateStatus.phase === "installing" || updateStatus.phase === "downloaded"
      ? updateStatus.version
      : "nouă";

  return (
    <>
      <UpdateBanner
        status={updateStatus}
        onInstall={
          updateStatus.phase === "downloaded" && dismissedReady
            ? () => void requestInstall()
            : undefined
        }
      />
      {showReadyModal ? (
        <UpdateReadyModal
          version={updateStatus.version}
          installing={installingLocal}
          onInstall={() => void requestInstall()}
          onLater={() => setDismissedReady(true)}
        />
      ) : null}
      {installingLocal || updateStatus.phase === "installing" ? (
        <UpdateInstallOverlay version={installVersion} />
      ) : null}
    </>
  );
}
