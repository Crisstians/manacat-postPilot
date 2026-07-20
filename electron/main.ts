import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session, shell } from "electron";
import type { TemplateAsset } from "../src/shared/types.js";
import { generateCaption } from "../src/services/captionGenerator.js";
import { exportPostAssets, composePostPngBuffer } from "../src/services/imageComposer.js";
import type { ExportRequest } from "../src/shared/types.js";
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

ipcMain.handle("post:export", async (_, payload: ExportRequest) => {
  const savePath = await dialog.showSaveDialog({
    title: "Salvează imaginea postării",
    defaultPath: `${payload.product.productName.replace(/\s+/g, "-").toLowerCase()}.png`,
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

ipcMain.handle("post:renderPng", async (_, payload: ExportRequest) => {
  try {
    if (!payload.textOverlayPngBase64) {
      return { success: false, error: "Overlay-ul text lipseste." };
    }

    const pngBuffer = await composePostPngBuffer({
      ...payload,
      textOverlayPngBase64: payload.textOverlayPngBase64,
      templatesDir: getTemplatesDir(),
    });

    return {
      success: true,
      pngBase64: pngBuffer.toString("base64"),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Nu s-a putut genera imaginea.",
    };
  }
});

app.whenReady().then(async () => {
  registerLocalFileProtocol();
  enableCrossOriginIsolation();
  setupAutoUpdater();
  await createWindow();
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
