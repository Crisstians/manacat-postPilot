import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, protocol, session, shell } from "electron";
import { generateCaption } from "../src/services/captionGenerator.js";
import { exportPostAssets, composePostPngBuffer } from "../src/services/imageComposer.js";
import { setupAutoUpdater } from "./autoUpdater.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_NAME = "Manacat PostPilot";
let mainWindow = null;
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
const LOCAL_IMAGE_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
};
const registerLocalFileProtocol = () => {
    protocol.handle("manacat", async (request) => {
        const prefix = "manacat://open/";
        if (!request.url.startsWith(prefix)) {
            return new Response("Not found", { status: 404 });
        }
        try {
            const filePath = decodeURIComponent(request.url.slice(prefix.length));
            const data = await fs.readFile(filePath);
            const mimeType = LOCAL_IMAGE_MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
            return new Response(data, {
                headers: {
                    "Content-Type": mimeType,
                    "Cross-Origin-Resource-Policy": "cross-origin",
                },
            });
        }
        catch {
            return new Response("Not found", { status: 404 });
        }
    });
};
const enableCrossOriginIsolation = () => {
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
const createWindow = async () => {
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
    }
    else {
        await mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
    }
};
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const getTemplatesDir = () => {
    if (!app.isPackaged) {
        return path.join(app.getAppPath(), "src/assets/templatesPostari");
    }
    return path.join(process.resourcesPath, "templatesPostari");
};
const formatTemplateName = (filename) => {
    const base = path.parse(filename).name;
    const spaced = base.replace(/[-_]+/g, " ").replace(/([a-z])(\d)/gi, "$1 $2");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
const listTemplates = async () => {
    const templatesDir = getTemplatesDir();
    let entries;
    try {
        entries = await fs.readdir(templatesDir);
    }
    catch {
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
const pickImage = async (title) => {
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
ipcMain.handle("dialog:pickProductImage", async () => pickImage("Alege poza produsului"));
ipcMain.handle("post:export", async (_, payload) => {
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
ipcMain.handle("post:renderPng", async (_, payload) => {
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
    }
    catch (error) {
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
