/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import type {
  BulkExportMode,
  BulkExportPickResult,
  BulkExportRequest,
  BulkExportResult,
  ExportRequest,
  ExportResult,
  PrepareImageResult,
  RenderPostResult,
  TemplateAsset,
  UpdateStatus,
} from "./shared/types";

declare global {
  interface Window {
    manacatApi?: {
      listTemplates: () => Promise<TemplateAsset[]>;
      pickProductImage: () => Promise<string | null>;
      toFileUrl: (filePath: string) => string;
      exportPost: (request: ExportRequest) => Promise<ExportResult>;
      pickBulkExport: (mode: BulkExportMode, postCount: number) => Promise<BulkExportPickResult>;
      exportBulk: (request: BulkExportRequest) => Promise<BulkExportResult>;
      renderPostPng: (request: ExportRequest) => Promise<RenderPostResult>;
      prepareImageForFacebook: (imageBase64: string) => Promise<PrepareImageResult>;
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
      installUpdate: () => Promise<{ ok: true } | { ok: false; error: string }>;
      openExternal: (url: string) => Promise<{ ok: true } | { ok: false; error: string }>;
    };
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemFileHandle {
    name: string;
    createWritable: () => Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle {
    getFileHandle: (
      name: string,
      options?: { create?: boolean },
    ) => Promise<FileSystemFileHandle>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write: (data: Blob | string) => Promise<void>;
    close: () => Promise<void>;
  }
}

export {};
