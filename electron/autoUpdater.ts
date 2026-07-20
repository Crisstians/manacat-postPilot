import { createRequire } from "node:module";
import { app, BrowserWindow, ipcMain } from "electron";
import type { AppUpdater } from "electron-updater";
import type { UpdateStatus } from "../src/shared/types.js";

const require = createRequire(import.meta.url);
const { autoUpdater } = require("electron-updater") as { autoUpdater: AppUpdater };

let lastUpdateStatus: UpdateStatus | null = null;
let updateCheckStarted = false;
let installRequested = false;
let downloadedVersion: string | null = null;

const sendUpdateStatus = (status: UpdateStatus): void => {
  lastUpdateStatus = status;
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send("update:status", status);
    }
  }
};

const startUpdateCheck = (): void => {
  if (updateCheckStarted) {
    return;
  }
  updateCheckStarted = true;
  void autoUpdater.checkForUpdates();
};

const installDownloadedUpdate = (): void => {
  if (installRequested) {
    return;
  }
  installRequested = true;

  const version = downloadedVersion ?? "nouă";
  sendUpdateStatus({ phase: "installing", version });

  // Lasă renderer-ul să afișeze overlay-ul înainte de quit.
  setTimeout(() => {
    autoUpdater.quitAndInstall(false, true);
  }, 700);
};

export const setupAutoUpdater = (getMainWindow: () => BrowserWindow | null): void => {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  ipcMain.handle("update:getStatus", () => lastUpdateStatus);
  ipcMain.handle("update:installAndRestart", () => {
    if (lastUpdateStatus?.phase !== "downloaded" && lastUpdateStatus?.phase !== "installing") {
      return { ok: false as const, error: "Nu există o actualizare gata de instalare." };
    }
    installDownloadedUpdate();
    return { ok: true as const };
  });

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
    downloadedVersion = info.version;
    sendUpdateStatus({ phase: "downloaded", version: info.version });
  });

  autoUpdater.on("error", (error) => {
    const message = error instanceof Error ? error.message : "Eroare la verificarea actualizărilor.";
    console.error("Auto-update error:", error);
    sendUpdateStatus({ phase: "error", message });
  });

  const scheduleUpdateCheck = (): void => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      setTimeout(scheduleUpdateCheck, 250);
      return;
    }

    const runCheck = () => {
      // Lasă renderer-ul să se aboneze la evenimente înainte de verificare.
      setTimeout(startUpdateCheck, 1500);
    };

    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once("did-finish-load", runCheck);
      return;
    }

    runCheck();
  };

  scheduleUpdateCheck();
};
