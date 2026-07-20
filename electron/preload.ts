import { contextBridge, ipcRenderer } from "electron";
import type {
  ExportRequest,
  ExportResult,
  PrepareImageResult,
  RenderPostResult,
  TemplateAsset,
  UpdateStatus,
} from "../src/shared/types.js";

const toFileUrl = (filePath: string): string =>
  `manacat://open/${encodeURIComponent(filePath)}`;

const api = {
  listTemplates: async (): Promise<TemplateAsset[]> => ipcRenderer.invoke("templates:list"),
  pickProductImage: async (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:pickProductImage"),
  toFileUrl,
  exportPost: async (request: ExportRequest): Promise<ExportResult> =>
    ipcRenderer.invoke("post:export", request),
  renderPostPng: async (request: ExportRequest): Promise<RenderPostResult> =>
    ipcRenderer.invoke("post:renderPng", request),
  prepareImageForFacebook: async (imageBase64: string): Promise<PrepareImageResult> =>
    ipcRenderer.invoke("image:prepareForFacebook", { imageBase64 }),
  onUpdateStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status);
    ipcRenderer.on("update:status", handler);
    void ipcRenderer.invoke("update:getStatus").then((status: UpdateStatus | null) => {
      if (status) {
        callback(status);
      }
    });
    return () => ipcRenderer.removeListener("update:status", handler);
  },
  installUpdate: async (): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke("update:installAndRestart"),
  openExternal: async (url: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke("shell:openExternal", url),
};

contextBridge.exposeInMainWorld("manacatApi", api);
