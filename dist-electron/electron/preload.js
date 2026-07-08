"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_url_1 = require("node:url");
const api = {
    listTemplates: async () => electron_1.ipcRenderer.invoke("templates:list"),
    pickProductImage: async () => electron_1.ipcRenderer.invoke("dialog:pickProductImage"),
    toFileUrl: (filePath) => (0, node_url_1.pathToFileURL)(filePath).toString(),
    exportPost: async (request) => electron_1.ipcRenderer.invoke("post:export", request),
    onUpdateStatus: (callback) => {
        const handler = (_event, status) => callback(status);
        electron_1.ipcRenderer.on("update:status", handler);
        return () => electron_1.ipcRenderer.removeListener("update:status", handler);
    },
};
electron_1.contextBridge.exposeInMainWorld("manacatApi", api);
