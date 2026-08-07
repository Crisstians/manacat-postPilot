import { contextBridge, ipcRenderer } from "electron";
import type {
  BulkExportPickResult,
  BulkExportRequest,
  BulkExportResult,
  BulkExportMode,
  ExportRequest,
  ExportResult,
  PrepareImageResult,
  RenderPostResult,
  TemplateAsset,
  UpdateStatus,
} from "../src/shared/types.js";

type PmanSaveResult =
  | { success: true; filePath: string }
  | { success: false; canceled?: boolean; error?: string };

type PmanOpenResult =
  | { success: true; filePath: string; content: string }
  | { success: false; canceled?: boolean; error?: string };

const toFileUrl = (filePath: string): string =>
  `manacat://open/${encodeURIComponent(filePath)}`;

const api = {
  listTemplates: async (): Promise<TemplateAsset[]> => ipcRenderer.invoke("templates:list"),
  pickProductImage: async (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:pickProductImage"),
  toFileUrl,
  exportPost: async (request: ExportRequest): Promise<ExportResult> =>
    ipcRenderer.invoke("post:export", request),
  pickBulkExport: async (
    mode: BulkExportMode,
    postCount: number,
  ): Promise<BulkExportPickResult> =>
    ipcRenderer.invoke("post:pickBulkExport", { mode, postCount }),
  exportBulk: async (request: BulkExportRequest): Promise<BulkExportResult> =>
    ipcRenderer.invoke("post:exportBulk", request),
  renderPostPng: async (request: ExportRequest): Promise<RenderPostResult> =>
    ipcRenderer.invoke("post:renderPng", request),
  prepareImageForFacebook: async (imageBase64: string): Promise<PrepareImageResult> =>
    ipcRenderer.invoke("image:prepareForFacebook", { imageBase64 }),
  readImageAsDataUrl: async (
    filePath: string,
  ): Promise<{ success: true; dataUrl: string } | { success: false; error: string }> =>
    ipcRenderer.invoke("image:readAsDataUrl", filePath),
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
  setWindowTitle: async (title: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke("window:setTitle", title),
  savePman: async (payload: {
    content: string;
    filePath?: string | null;
  }): Promise<PmanSaveResult> => ipcRenderer.invoke("pman:save", payload),
  openPman: async (): Promise<PmanOpenResult> => ipcRenderer.invoke("pman:open"),
  readPmanPath: async (filePath: string): Promise<PmanOpenResult> =>
    ipcRenderer.invoke("pman:readPath", filePath),
  getPendingPmanPath: async (): Promise<string | null> =>
    ipcRenderer.invoke("pman:getPendingPath"),
  onOpenPmanPath: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => {
      if (typeof filePath === "string" && filePath) callback(filePath);
    };
    ipcRenderer.on("pman:open-path", handler);
    return () => ipcRenderer.removeListener("pman:open-path", handler);
  },
};

contextBridge.exposeInMainWorld("manacatApi", api);
