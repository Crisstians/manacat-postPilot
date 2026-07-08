/// <reference types="vite/client" />

import type { ExportRequest, ExportResult, TemplateAsset, UpdateStatus } from "./shared/types";

declare global {
  interface Window {
    manacatApi?: {
      listTemplates: () => Promise<TemplateAsset[]>;
      pickProductImage: () => Promise<string | null>;
      toFileUrl: (filePath: string) => string;
      exportPost: (request: ExportRequest) => Promise<ExportResult>;
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
    };
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  }

  interface FileSystemFileHandle {
    name: string;
    createWritable: () => Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }
}

export {};
