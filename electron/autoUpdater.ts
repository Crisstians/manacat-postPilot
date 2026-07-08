import { createRequire } from "node:module";
import { app, BrowserWindow, dialog } from "electron";
import type { AppUpdater } from "electron-updater";
import type { UpdateStatus } from "../src/shared/types.js";

const require = createRequire(import.meta.url);
const { autoUpdater } = require("electron-updater") as { autoUpdater: AppUpdater };

const sendUpdateStatus = (status: UpdateStatus): void => {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("update:status", status);
  }
};

export const setupAutoUpdater = (): void => {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus({ phase: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdateStatus({ phase: "available", version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    sendUpdateStatus({ phase: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({ phase: "downloading", percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendUpdateStatus({ phase: "downloaded", version: info.version });
    void dialog
      .showMessageBox({
        type: "info",
        title: "Actualizare disponibilă",
        message: "O versiune nouă a fost descărcată.",
        detail: "Repornește aplicația pentru a instala actualizarea.",
        buttons: ["Repornește acum", "Mai târziu"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto-update error:", error);
    sendUpdateStatus({
      phase: "error",
      message: error instanceof Error ? error.message : "Eroare la verificarea actualizărilor.",
    });
  });

  void autoUpdater.checkForUpdates();
};
