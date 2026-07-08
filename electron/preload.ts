import { contextBridge, ipcRenderer } from "electron";
import { pathToFileURL } from "node:url";
import type { ExportRequest, ExportResult, TemplateAsset } from "../src/shared/types.js";

const api = {
  listTemplates: async (): Promise<TemplateAsset[]> => ipcRenderer.invoke("templates:list"),
  pickProductImage: async (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:pickProductImage"),
  toFileUrl: (filePath: string): string => pathToFileURL(filePath).toString(),
  exportPost: async (request: ExportRequest): Promise<ExportResult> =>
    ipcRenderer.invoke("post:export", request),
};

contextBridge.exposeInMainWorld("manacatApi", api);
