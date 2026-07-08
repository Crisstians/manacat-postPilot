import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, session, shell } from "electron";
import type { TemplateAsset } from "../src/shared/types.js";
import { generateCaption } from "../src/services/captionGenerator.js";
import { exportPostAssets } from "../src/services/imageComposer.js";
import type { ExportRequest } from "../src/shared/types.js";
import { setupAutoUpdater } from "./autoUpdater.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_NAME = "Manacat PostPilot";
let mainWindow: Electron.BrowserWindow | null = null;

app.setName(APP_NAME);

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
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const getTemplatesDir = (): string => {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), "src/assets/templatesPostari");
  }
  return path.join(process.resourcesPath, "templatesPostari");
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
    .map((filename) => ({
      id: path.parse(filename).name,
      name: formatTemplateName(filename),
      path: path.join(templatesDir, filename),
    }));
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
  return result.filePaths[0];
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
  });

  if (result.success) {
    shell.showItemInFolder(savePath.filePath);
  }

  return result;
});

app.whenReady().then(async () => {
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
