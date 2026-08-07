import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { EXPORT_OUTPUT_SCALE, exportOutputSize } from "../shared/exportQuality.js";
import { getDisplayProductImagePath } from "../shared/productImage.js";
import type { ExportJob, ExportRequest, ExportResult } from "../shared/types.js";
import { resolveProductImageRect } from "./layout.js";

const getTemplateIdFromPath = (imagePath: string): string => {
  const filename = imagePath.split(/[/\\]/).pop() ?? imagePath;
  const base = filename.replace(/\.[^.]+$/, "");
  const dashIndex = base.lastIndexOf("-");
  if (dashIndex > 0 && /^[A-Za-z0-9_-]{6,}$/.test(base.slice(dashIndex + 1))) {
    return base.slice(0, dashIndex);
  }
  return base;
};

const isRemoteHttpUrl = (source: string): boolean => /^https?:\/\//i.test(source.trim());

const stripBase64Payload = (value: string): string =>
  value.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/i, "").trim();

const looksLikeImageBuffer = (buffer: Buffer): boolean => {
  if (buffer.length < 12) return false;
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true;
  }
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return true;
  }
  // WebP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }
  // AVIF / HEIC (ftyp....)
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return true;
  }
  return false;
};

/** Re-encode via Chromium when Sharp cannot decode (e.g. odd CDN formats). */
const toSharpReadableBuffer = async (buffer: Buffer, label: string): Promise<Buffer> => {
  try {
    await sharp(buffer, { failOn: "none" }).metadata();
    return buffer;
  } catch {
    try {
      const { nativeImage } = await import("electron");
      const image = nativeImage.createFromBuffer(buffer);
      if (image.isEmpty()) {
        throw new Error(`${label}: buffer gol după decode.`);
      }
      return image.toPNG();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "decode eșuat";
      throw new Error(`${label} nu este o imagine suportată (${detail}).`);
    }
  }
};

const fetchRemoteImageBuffer = async (url: string, label: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nu s-a putut descărca ${label} (${response.status}).`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!looksLikeImageBuffer(buffer)) {
    throw new Error(`${label} descărcat nu arată a imagine (PNG/JPEG/WebP/AVIF).`);
  }
  return toSharpReadableBuffer(buffer, label);
};

const bufferFromBase64 = async (value: string, label: string): Promise<Buffer> => {
  const buffer = Buffer.from(stripBase64Payload(value), "base64");
  if (buffer.length < 32) {
    throw new Error(`${label}: date base64 invalide sau goale.`);
  }
  return toSharpReadableBuffer(buffer, label);
};

const resolveBackgroundPath = async (
  backgroundImagePath: string,
  templatesDir?: string,
): Promise<string> => {
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

const resolveBackgroundInput = async (
  request: ExportRequest & { templatesDir?: string },
): Promise<string | Buffer> => {
  if (request.backgroundImageBase64) {
    return bufferFromBase64(request.backgroundImageBase64, "Fundalul template-ului");
  }

  const backgroundPath = request.template.backgroundImagePath?.trim() ?? "";
  if (!backgroundPath) {
    throw new Error("Nu ai ales fundalul template-ului.");
  }

  // Remote API templates: download in main process (never pass URLs to Sharp).
  if (isRemoteHttpUrl(backgroundPath)) {
    return fetchRemoteImageBuffer(backgroundPath, "Fundalul template-ului");
  }

  const resolved = await resolveBackgroundPath(backgroundPath, request.templatesDir);
  if (isRemoteHttpUrl(resolved) || resolved.startsWith("blob:") || resolved.startsWith("data:")) {
    throw new Error("Fundalul template-ului nu a putut fi rezolvat la un fișier local.");
  }
  if (!existsSync(resolved)) {
    throw new Error("Fișierul de fundal lipsește.");
  }
  return resolved;
};

const resolveProductInput = async (
  request: ExportRequest,
): Promise<string | Buffer> => {
  if (request.productImageBase64) {
    return bufferFromBase64(request.productImageBase64, "Poza produsului");
  }

  const productPath = getDisplayProductImagePath(request.product).trim();
  if (!productPath) {
    throw new Error("Nu ai ales poza produsului.");
  }

  if (isRemoteHttpUrl(productPath)) {
    return fetchRemoteImageBuffer(productPath, "Poza produsului");
  }

  if (productPath.startsWith("manacat://open/")) {
    return decodeURIComponent(productPath.slice("manacat://open/".length));
  }

  return productPath;
};

const composeBackgroundLayer = async (
  backgroundInput: string | Buffer,
  width: number,
  height: number,
): Promise<Buffer> => {
  try {
    return await sharp(backgroundInput)
      .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 2, adaptiveFiltering: true })
      .toBuffer();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "eroare necunoscută";
    throw new Error(`Fundal (Sharp): ${detail}`);
  }
};

const normalizeTextOverlay = async (
  textOverlayPngBase64: string,
  width: number,
  height: number,
): Promise<Buffer> => {
  try {
    const overlay = sharp(Buffer.from(stripBase64Payload(textOverlayPngBase64), "base64"));
    const metadata = await overlay.metadata();

    if (metadata.width === width && metadata.height === height) {
      return overlay.png({ compressionLevel: 2, adaptiveFiltering: true }).toBuffer();
    }

    return overlay
      .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 2, adaptiveFiltering: true })
      .toBuffer();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "eroare necunoscută";
    throw new Error(`Overlay text (Sharp): ${detail}`);
  }
};

export const composePostPngBuffer = async (
  request: ExportRequest & { textOverlayPngBase64: string; templatesDir?: string },
): Promise<Buffer> => {
  if (!request.template.backgroundImagePath && !request.backgroundImageBase64) {
    throw new Error("Nu ai ales fundalul template-ului.");
  }
  if (!request.product.productImagePath && !request.productImageBase64) {
    throw new Error("Nu ai ales poza produsului.");
  }
  if (!request.textOverlayPngBase64) {
    throw new Error("Overlay-ul text lipseste. Reincarca aplicatia si incearca din nou.");
  }

  const output = exportOutputSize(request.template.width, request.template.height);
  const s = EXPORT_OUTPUT_SCALE;

  let productInput: string | Buffer;
  try {
    productInput = await resolveProductInput(request);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "eroare necunoscută";
    throw new Error(`Poza produsului: ${detail}`);
  }

  let productMeta: { width?: number; height?: number };
  try {
    productMeta = await sharp(productInput).metadata();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "eroare necunoscută";
    throw new Error(`Poza produsului (Sharp): ${detail}`);
  }

  const fitted = resolveProductImageRect(
    productMeta.width ?? request.template.productLayer.width,
    productMeta.height ?? request.template.productLayer.height,
    request.template.productLayer,
    request.product.productImageLayout,
  );

  const productWidth = Math.round(fitted.width * s);
  const productHeight = Math.round(fitted.height * s);
  const productX = Math.round(fitted.x * s);
  const productY = Math.round(fitted.y * s);

  const productLayer = await sharp(productInput)
    .resize(productWidth, productHeight, { fit: "contain", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 2, adaptiveFiltering: true })
    .toBuffer();

  const shadowEnabled = Boolean(request.product.productImageProcessedPath);
  const layoutScale =
    request.template.productLayer.height > 0 ? fitted.height / request.template.productLayer.height : 1;
  const shadowBlur = Math.round(22 * layoutScale * s);
  const shadowOffsetY = Math.round(8 * layoutScale * s);
  const shadowOpacity = 0.35;

  const shadowLayer = shadowEnabled
    ? await sharp(productLayer)
        .ensureAlpha()
        .blur(shadowBlur)
        .tint("#000")
        .linear(shadowOpacity, 0)
        .png({ compressionLevel: 2, adaptiveFiltering: true })
        .toBuffer()
    : null;

  const textOverlay = await normalizeTextOverlay(
    request.textOverlayPngBase64,
    output.width,
    output.height,
  );
  const backgroundInput = await resolveBackgroundInput(request);
  const backgroundLayer = await composeBackgroundLayer(
    backgroundInput,
    output.width,
    output.height,
  );

  return sharp(backgroundLayer)
    .composite([
      ...(shadowLayer
        ? [
            {
              input: shadowLayer,
              left: productX,
              top: productY + shadowOffsetY,
            },
          ]
        : []),
      { input: productLayer, left: productX, top: productY },
      { input: textOverlay },
    ])
    .png({ compressionLevel: 2, adaptiveFiltering: true })
    .toBuffer();
};

export const exportPostAssets = async (job: ExportJob): Promise<ExportResult> => {
  try {
    const pngBuffer = await composePostPngBuffer({
      product: job.product,
      template: job.template,
      textOverlayPngBase64: job.textOverlayPngBase64,
      productImageBase64: job.productImageBase64,
      backgroundImageBase64: job.backgroundImageBase64,
      templatesDir: job.templatesDir,
    });

    await fs.writeFile(job.outputImagePath, pngBuffer);
    await fs.writeFile(job.outputCaptionPath, job.caption, "utf-8");

    return {
      success: true,
      imagePath: job.outputImagePath,
      captionPath: job.outputCaptionPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Export esuat",
    };
  }
};
