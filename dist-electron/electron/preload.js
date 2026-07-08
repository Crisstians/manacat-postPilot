import { contextBridge, ipcRenderer } from "electron";
import { pathToFileURL } from "node:url";
const api = {
    listTemplates: async () => ipcRenderer.invoke("templates:list"),
    pickProductImage: async () => ipcRenderer.invoke("dialog:pickProductImage"),
    toFileUrl: (filePath) => pathToFileURL(filePath).toString(),
    exportPost: async (request) => ipcRenderer.invoke("post:export", request),
    onUpdateStatus: (callback) => {
        const handler = (_event, status) => callback(status);
        ipcRenderer.on("update:status", handler);
        return () => ipcRenderer.removeListener("update:status", handler);
    },
};
contextBridge.exposeInMainWorld("manacatApi", api);
