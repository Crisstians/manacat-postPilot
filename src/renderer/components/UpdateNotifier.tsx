import { useEffect, useState } from "react";
import type { UpdateStatus } from "../../shared/types";

const getUpdateBannerMessage = (status: UpdateStatus): string | null => {
  switch (status.phase) {
    case "checking":
      return "Se verifică actualizări...";
    case "available":
      return `Actualizare disponibilă (v${status.version}). Se descarcă...`;
    case "downloading":
      return `Se descarcă actualizarea... ${status.percent}%`;
    case "downloaded":
      return `Actualizare descărcată (v${status.version}). Repornește aplicația pentru instalare.`;
    case "error":
      return `Actualizare eșuată: ${status.message}`;
    case "not-available":
      return null;
  }
};

const isUpdateBannerLoading = (status: UpdateStatus): boolean =>
  status.phase === "checking" || status.phase === "downloading" || status.phase === "available";

export function UpdateNotifier() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    const unsubscribe = window.manacatApi?.onUpdateStatus?.((status) => {
      setUpdateStatus(status);
    });
    return () => unsubscribe?.();
  }, []);

  const message = updateStatus ? getUpdateBannerMessage(updateStatus) : null;
  if (!message) {
    return null;
  }

  const isError = updateStatus?.phase === "error";

  return (
    <div
      className={`alert flex items-center justify-center gap-2 rounded-none border-b py-2 text-sm font-medium ${
        isError ? "alert-soft alert-error border-error/30" : "alert-soft alert-warning border-warning/30"
      }`}
      role="status"
    >
      {!isError && updateStatus && isUpdateBannerLoading(updateStatus) ? (
        <span className={`loading loading-spinner loading-xs ${isError ? "text-error" : "text-warning"}`} />
      ) : null}
      <span>{message}</span>
    </div>
  );
}
