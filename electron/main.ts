import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session, shell } from "electron";
import { generateCaption } from "../src/services/captionGenerator.js";
import { exportPostAssets, composePostPngBuffer } from "../src/services/imageComposer.js";
import { prepareForFacebook } from "../src/services/prepareForFacebook.js";
import type {
  BulkExportRequest,
  BulkExportResult,
  ExportRequest,
  TemplateAsset,
} from "../src/shared/types.js";
import { setupAutoUpdater } from "./autoUpdater.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_NAME = "Manacat PostPilot";
let mainWindow: Electron.BrowserWindow | null = null;

app.setName(APP_NAME);

protocol.registerSchemesAsPrivileged([
  {
    scheme: "manacat",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const LOCAL_IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const getTemplatesDir = (): string => {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), "src/assets/templatesPostari");
  }
  return path.join(process.resourcesPath, "templatesPostari");
};

const allowedLocalImagePaths = new Set<string>();

const resolveLocalImagePath = (filePath: string): string => path.resolve(filePath);

const registerAllowedLocalImage = (filePath: string): void => {
  allowedLocalImagePaths.add(resolveLocalImagePath(filePath));
};

const getAllowedUserImageDirs = (): string[] => {
  const home = app.getPath("home");
  return ["Downloads", "Pictures", "Desktop", "Documents"].map((dirName) =>
    resolveLocalImagePath(path.join(home, dirName)),
  );
};

const canServeLocalImage = async (filePath: string): Promise<boolean> => {
  const resolved = resolveLocalImagePath(filePath);
  const extension = path.extname(resolved).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) {
    return false;
  }

  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    return false;
  }
  if (!stat.isFile()) {
    return false;
  }

  const templatesDir = resolveLocalImagePath(getTemplatesDir());
  if (resolved === templatesDir || resolved.startsWith(`${templatesDir}${path.sep}`)) {
    return true;
  }

  if (allowedLocalImagePaths.has(resolved)) {
    return true;
  }

  return getAllowedUserImageDirs().some(
    (allowedDir) => resolved === allowedDir || resolved.startsWith(`${allowedDir}${path.sep}`),
  );
};

const registerLocalFileProtocol = (): void => {
  protocol.handle("manacat", async (request) => {
    const prefix = "manacat://open/";
    if (!request.url.startsWith(prefix)) {
      return new Response("Not found", { status: 404 });
    }

    try {
      const filePath = decodeURIComponent(request.url.slice(prefix.length));
      if (!(await canServeLocalImage(filePath))) {
        return new Response("Forbidden", { status: 403 });
      }

      const resolvedPath = resolveLocalImagePath(filePath);
      const data = await fs.readFile(resolvedPath);
      const mimeType =
        LOCAL_IMAGE_MIME[path.extname(resolvedPath).toLowerCase()] ?? "application/octet-stream";

      return new Response(data, {
        headers: {
          "Content-Type": mimeType,
          "Cross-Origin-Resource-Policy": "cross-origin",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
};

const enableCrossOriginIsolation = (): void => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Cross-Origin-Opener-Policy": ["same-origin"],
        "Cross-Origin-Embedder-Policy": ["require-corp"],
      },
    });
  });
};

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1440,
    height: 940,
    autoHideMenuBar: true,
    backgroundColor: "#f5f5f6",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow?.setTitle(APP_NAME);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
};

const formatTemplateName = (filename: string): string => {
  const base = path.parse(filename).name;
  const spaced = base.replace(/[-_]+/g, " ").replace(/([a-z])(\d)/gi, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const listTemplates = async (): Promise<TemplateAsset[]> => {
  const templatesDir = getTemplatesDir();
  let entries: string[];
  try {
    entries = await fs.readdir(templatesDir);
  } catch {
    return [];
  }

  return entries
    .filter((entry) => IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase()))
    .sort((left, right) => left.localeCompare(right, "ro"))
    .map((filename) => {
      const templatePath = path.join(templatesDir, filename);
      registerAllowedLocalImage(templatePath);
      return {
        id: path.parse(filename).name,
        name: formatTemplateName(filename),
        path: templatePath,
      };
    });
};

const pickImage = async (title: string): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    title,
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  registerAllowedLocalImage(filePath);
  return filePath;
};

ipcMain.handle("templates:list", async () => listTemplates());

ipcMain.handle("dialog:pickProductImage", async () =>
  pickImage("Alege poza produsului"),
);

ipcMain.handle(
  "shell:openExternal",
  async (_event, url: unknown): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return { ok: false, error: "URL invalid." };
    }
    try {
      await shell.openExternal(url);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Nu s-a putut deschide browserul.",
      };
    }
  },
);

const slugifyProductName = (productName: string): string => {
  const slug = productName.trim().replace(/\s+/g, "-").toLowerCase();
  return slug || "postare-manacat";
};

const uniqueBaseNames = (requests: ExportRequest[]): string[] => {
  const used = new Map<string, number>();
  return requests.map((request, index) => {
    const base = slugifyProductName(request.product.productName);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    if (count === 1) {
      const collisionAhead = requests.some(
        (other, otherIndex) =>
          otherIndex > index && slugifyProductName(other.product.productName) === base,
      );
      if (!collisionAhead) return base;
    }
    return `${base}-${index + 1}`;
  });
};

ipcMain.handle("post:export", async (_, payload: ExportRequest) => {
  const savePath = await dialog.showSaveDialog({
    title: "Salvează imaginea postării",
    defaultPath: `${slugifyProductName(payload.product.productName)}.png`,
    filters: [{ name: "PNG Image", extensions: ["png"] }],
  });

  if (savePath.canceled || !savePath.filePath) {
    return { success: false, error: "Export anulat de utilizator." };
  }

  const caption = generateCaption(payload.product);
  const result = await exportPostAssets({
    ...payload,
    textOverlayPngBase64: payload.textOverlayPngBase64 ?? "",
    outputImagePath: savePath.filePath,
    outputCaptionPath: savePath.filePath.replace(/\.png$/i, ".txt"),
    caption,
    templatesDir: getTemplatesDir(),
  });

  if (result.success) {
    shell.showItemInFolder(savePath.filePath);
  }

  return result;
});

ipcMain.handle(
  "post:pickBulkExport",
  async (
    _,
    payload: { mode: BulkExportRequest["mode"]; postCount?: number },
  ): Promise<import("../src/shared/types.js").BulkExportPickResult> => {
    const postCount = payload?.postCount ?? 0;
    try {
      if (payload.mode === "folder") {
        const folderPick = await dialog.showOpenDialog({
          title: "Alege folderul pentru exportul lotului",
          properties: ["openDirectory", "createDirectory"],
        });
        if (folderPick.canceled || !folderPick.filePaths[0]) {
          return { success: false, error: "Export anulat de utilizator." };
        }
        return { success: true, outputPath: folderPick.filePaths[0] };
      }

      const zipPick = await dialog.showSaveDialog({
        title: "Salvează arhiva ZIP a lotului",
        defaultPath: `lot-manacat-${Math.max(postCount, 1)}-postari.zip`,
        filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      });
      if (zipPick.canceled || !zipPick.filePath) {
        return { success: false, error: "Export anulat de utilizator." };
      }
      const zipPath = zipPick.filePath.endsWith(".zip")
        ? zipPick.filePath
        : `${zipPick.filePath}.zip`;
      return { success: true, outputPath: zipPath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Nu s-a putut alege destinația.",
      };
    }
  },
);

ipcMain.handle(
  "post:exportBulk",
  async (_, payload: BulkExportRequest): Promise<BulkExportResult> => {
    const requests = payload?.requests ?? [];
    if (requests.length === 0) {
      return { success: false, error: "Nu există postări de exportat." };
    }

    const templatesDir = getTemplatesDir();
    const baseNames = uniqueBaseNames(requests);

    try {
      if (payload.mode === "folder") {
        let folderPath = payload.outputPath?.trim() ?? "";
        if (!folderPath) {
          const folderPick = await dialog.showOpenDialog({
            title: "Alege folderul pentru exportul lotului",
            properties: ["openDirectory", "createDirectory"],
          });

          if (folderPick.canceled || !folderPick.filePaths[0]) {
            return { success: false, error: "Export anulat de utilizator." };
          }
          folderPath = folderPick.filePaths[0];
        }

        let firstImagePath = "";

        for (let index = 0; index < requests.length; index += 1) {
          const request = requests[index]!;
          const baseName = baseNames[index]!;
          const imagePath = path.join(folderPath, `${baseName}.png`);
          const captionPath = path.join(folderPath, `${baseName}.txt`);
          const result = await exportPostAssets({
            ...request,
            textOverlayPngBase64: request.textOverlayPngBase64 ?? "",
            outputImagePath: imagePath,
            outputCaptionPath: captionPath,
            caption: generateCaption(request.product),
            templatesDir,
          });
          if (!result.success) {
            return {
              success: false,
              error: result.error ?? `Export eșuat la postarea ${index + 1}.`,
            };
          }
          if (!firstImagePath) firstImagePath = imagePath;
        }

        if (firstImagePath) {
          shell.showItemInFolder(firstImagePath);
        }

        return {
          success: true,
          outputPath: folderPath,
          exportedCount: requests.length,
        };
      }

      let zipPath = payload.outputPath?.trim() ?? "";
      if (!zipPath) {
        const zipPick = await dialog.showSaveDialog({
          title: "Salvează arhiva ZIP a lotului",
          defaultPath: `lot-manacat-${requests.length}-postari.zip`,
          filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
        });

        if (zipPick.canceled || !zipPick.filePath) {
          return { success: false, error: "Export anulat de utilizator." };
        }

        zipPath = zipPick.filePath.endsWith(".zip")
          ? zipPick.filePath
          : `${zipPick.filePath}.zip`;
      } else if (!zipPath.endsWith(".zip")) {
        zipPath = `${zipPath}.zip`;
      }

      const zip = new JSZip();
      for (let index = 0; index < requests.length; index += 1) {
        const request = requests[index]!;
        const baseName = baseNames[index]!;
        if (!request.textOverlayPngBase64) {
          return {
            success: false,
            error: `Overlay-ul text lipsește pentru postarea ${index + 1}.`,
          };
        }
        const pngBuffer = await composePostPngBuffer({
          ...request,
          textOverlayPngBase64: request.textOverlayPngBase64,
          templatesDir,
        });
        zip.file(`${baseName}.png`, pngBuffer);
        zip.file(`${baseName}.txt`, generateCaption(request.product));
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      await fs.writeFile(zipPath, zipBuffer);

      shell.showItemInFolder(zipPath);

      return {
        success: true,
        outputPath: zipPath,
        exportedCount: requests.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Export bulk eșuat.",
      };
    }
  },
);

ipcMain.handle("post:renderPng", async (_, payload: ExportRequest) => {
  try {
    if (!payload.textOverlayPngBase64) {
      return { success: false, error: "Overlay-ul text lipseste." };
    }

    const composed = await composePostPngBuffer({
      ...payload,
      textOverlayPngBase64: payload.textOverlayPngBase64,
      templatesDir: getTemplatesDir(),
    });
    const prepared = await prepareForFacebook(composed);
    const imageBase64 = prepared.buffer.toString("base64");

    return {
      success: true,
      imageBase64,
      pngBase64: imageBase64,
      mimeType: prepared.mimeType,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Nu s-a putut genera imaginea.",
    };
  }
});

ipcMain.handle("image:prepareForFacebook", async (_, payload: { imageBase64: string }) => {
  try {
    const raw = payload?.imageBase64?.replace(/^data:image\/[a-zA-Z+]+;base64,/, "") ?? "";
    if (!raw) {
      return { success: false, error: "Imaginea lipseste." };
    }
    const prepared = await prepareForFacebook(Buffer.from(raw, "base64"));
    return {
      success: true,
      imageBase64: prepared.buffer.toString("base64"),
      mimeType: prepared.mimeType,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Nu s-a putut pregati imaginea pentru Facebook.",
    };
  }
});

app.whenReady().then(async () => {
  registerLocalFileProtocol();
  enableCrossOriginIsolation();
  await createWindow();
  setupAutoUpdater(() => mainWindow);
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
