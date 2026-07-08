import { contextBridge, ipcRenderer } from "electron";
import { pathToFileURL } from "node:url";
const api = {
    listTemplates: async () => ipcRenderer.invoke("templates:list"),
    pickProductImage: async () => ipcRenderer.invoke("dialog:pickProductImage"),
    toFileUrl: (filePath) => pathToFileURL(filePath).toString(),
    exportPost: async (request) => ipcRenderer.invoke("post:export", request),
};
contextBridge.exposeInMainWorld("manacatApi", api);
