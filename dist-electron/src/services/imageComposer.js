import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getDisplayProductImagePath } from "../shared/productImage.js";
import { resolveProductImageRect } from "./layout.js";
const getTemplateIdFromPath = (imagePath) => {
    const filename = imagePath.split(/[/\\]/).pop() ?? imagePath;
    const base = filename.replace(/\.[^.]+$/, "");
    const dashIndex = base.lastIndexOf("-");
    if (dashIndex > 0 && /^[A-Za-z0-9_-]{6,}$/.test(base.slice(dashIndex + 1))) {
        return base.slice(0, dashIndex);
    }
    return base;
};
const resolveBackgroundPath = async (backgroundImagePath, templatesDir) => {
    if (backgroundImagePath.startsWith("manacat://open/")) {
        return decodeURIComponent(backgroundImagePath.slice("manacat://open/".length));
    }
    if (existsSync(backgroundImagePath)) {
        return backgroundImagePath;
    }
    if (!templatesDir) {
        return backgroundImagePath;
    }
    const templateId = getTemplateIdFromPath(backgroundImagePath);
    const entries = await fs.readdir(templatesDir);
    const match = entries.find((entry) => path.parse(entry).name === templateId);
    if (match) {
        return path.join(templatesDir, match);
    }
    return backgroundImagePath;
};
const composeBackgroundLayer = async (backgroundPath, width, height) => {
    const metadata = await sharp(backgroundPath).metadata();
    const sourceWidth = metadata.width ?? width;
    const sourceHeight = metadata.height ?? height;
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const scaledWidth = Math.ceil(sourceWidth * scale);
    const scaledHeight = Math.ceil(sourceHeight * scale);
    return sharp(backgroundPath)
        .resize(scaledWidth, scaledHeight)
        .extract({
        left: Math.max(0, scaledWidth - width),
        top: Math.max(0, scaledHeight - height),
        width,
        height,
    })
        .png()
        .toBuffer();
};
const normalizeTextOverlay = async (textOverlayPngBase64, width, height) => {
    const overlay = sharp(Buffer.from(textOverlayPngBase64, "base64"));
    const metadata = await overlay.metadata();
    if (metadata.width === width && metadata.height === height) {
        return overlay.png().toBuffer();
    }
    return overlay.resize(width, height, { fit: "fill" }).png().toBuffer();
};
export const composePostPngBuffer = async (request) => {
    if (!request.template.backgroundImagePath) {
        throw new Error("Nu ai ales fundalul template-ului.");
    }
    if (!request.product.productImagePath) {
        throw new Error("Nu ai ales poza produsului.");
    }
    if (!request.textOverlayPngBase64) {
        throw new Error("Overlay-ul text lipseste. Reincarca aplicatia si incearca din nou.");
    }
    const productImageSource = getDisplayProductImagePath(request.product);
    const productInput = request.productImageBase64
        ? Buffer.from(request.productImageBase64, "base64")
        : productImageSource;
    const productMeta = await sharp(productInput).metadata();
    const fitted = resolveProductImageRect(productMeta.width ?? request.template.productLayer.width, productMeta.height ?? request.template.productLayer.height, request.template.productLayer, request.product.productImageLayout);
    const productLayer = await sharp(productInput)
        .resize(Math.round(fitted.width), Math.round(fitted.height), { fit: "contain" })
        .png()
        .toBuffer();
    const shadowEnabled = Boolean(request.product.productImageProcessedPath);
    const scale = request.template.productLayer.height > 0 ? fitted.height / request.template.productLayer.height : 1;
    const shadowBlur = Math.round(22 * scale);
    const shadowOffsetY = Math.round(8 * scale);
    const shadowOpacity = 0.35;
    const shadowLayer = shadowEnabled
        ? await sharp(productLayer)
            .ensureAlpha()
            .blur(shadowBlur)
            .tint("#000")
            .linear(shadowOpacity, 0)
            .png()
            .toBuffer()
        : null;
    const textOverlay = await normalizeTextOverlay(request.textOverlayPngBase64, request.template.width, request.template.height);
    const backgroundPath = await resolveBackgroundPath(request.template.backgroundImagePath, request.templatesDir);
    const backgroundLayer = await composeBackgroundLayer(backgroundPath, request.template.width, request.template.height);
    return sharp(backgroundLayer)
        .composite([
        ...(shadowLayer
            ? [
                {
                    input: shadowLayer,
                    left: Math.round(fitted.x),
                    top: Math.round(fitted.y) + shadowOffsetY,
                },
            ]
            : []),
        { input: productLayer, left: Math.round(fitted.x), top: Math.round(fitted.y) },
        { input: textOverlay },
    ])
        .png()
        .toBuffer();
};
export const exportPostAssets = async (job) => {
    try {
        const pngBuffer = await composePostPngBuffer({
            product: job.product,
            template: job.template,
            textOverlayPngBase64: job.textOverlayPngBase64,
            productImageBase64: job.productImageBase64,
            templatesDir: job.templatesDir,
        });
        await fs.writeFile(job.outputImagePath, pngBuffer);
        await fs.writeFile(job.outputCaptionPath, job.caption, "utf-8");
        return {
            success: true,
            imagePath: job.outputImagePath,
            captionPath: job.outputCaptionPath,
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Export esuat",
        };
    }
};
