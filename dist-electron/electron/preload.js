"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const toFileUrl = (filePath) => `manacat://open/${encodeURIComponent(filePath)}`;
const api = {
    listTemplates: async () => electron_1.ipcRenderer.invoke("templates:list"),
    pickProductImage: async () => electron_1.ipcRenderer.invoke("dialog:pickProductImage"),
    toFileUrl,
    exportPost: async (request) => electron_1.ipcRenderer.invoke("post:export", request),
    renderPostPng: async (request) => electron_1.ipcRenderer.invoke("post:renderPng", request),
    onUpdateStatus: (callback) => {
        const handler = (_event, status) => callback(status);
        electron_1.ipcRenderer.on("update:status", handler);
        return () => electron_1.ipcRenderer.removeListener("update:status", handler);
    },
};
electron_1.contextBridge.exposeInMainWorld("manacatApi", api);
