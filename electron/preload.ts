import { contextBridge, ipcRenderer } from "electron";
import { pathToFileURL } from "node:url";
import type { ExportRequest, ExportResult, TemplateAsset, UpdateStatus } from "../src/shared/types.js";

const api = {
  listTemplates: async (): Promise<TemplateAsset[]> => ipcRenderer.invoke("templates:list"),
  pickProductImage: async (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:pickProductImage"),
  toFileUrl: (filePath: string): string => pathToFileURL(filePath).toString(),
  exportPost: async (request: ExportRequest): Promise<ExportResult> =>
    ipcRenderer.invoke("post:export", request),
  onUpdateStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status);
    ipcRenderer.on("update:status", handler);
    return () => ipcRenderer.removeListener("update:status", handler);
  },
};

contextBridge.exposeInMainWorld("manacatApi", api);
