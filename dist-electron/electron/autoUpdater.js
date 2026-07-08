import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
export const setupAutoUpdater = () => {
    if (!app.isPackaged) {
        return;
    }
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("error", (error) => {
        console.error("Auto-update error:", error);
    });
    autoUpdater.on("update-downloaded", () => {
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
    void autoUpdater.checkForUpdatesAndNotify();
};
