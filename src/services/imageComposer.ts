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

const composeBackgroundLayer = async (
  backgroundPath: string,
  width: number,
  height: number,
): Promise<Buffer> => {
  const metadata = await sharp(backgroundPath).metadata();
  const sourceWidth = metadata.width ?? width;
  const sourceHeight = metadata.height ?? height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const scaledWidth = Math.ceil(sourceWidth * scale);
  const scaledHeight = Math.ceil(sourceHeight * scale);

  return sharp(backgroundPath)
    .resize(scaledWidth, scaledHeight, { kernel: sharp.kernel.lanczos3 })
    .extract({
      left: Math.max(0, scaledWidth - width),
      top: Math.max(0, scaledHeight - height),
      width,
      height,
    })
    .png({ compressionLevel: 2, adaptiveFiltering: true })
    .toBuffer();
};

const normalizeTextOverlay = async (
  textOverlayPngBase64: string,
  width: number,
  height: number,
): Promise<Buffer> => {
  const overlay = sharp(Buffer.from(textOverlayPngBase64, "base64"));
  const metadata = await overlay.metadata();

  if (metadata.width === width && metadata.height === height) {
    return overlay.png({ compressionLevel: 2, adaptiveFiltering: true }).toBuffer();
  }

  return overlay
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 2, adaptiveFiltering: true })
    .toBuffer();
};

export const composePostPngBuffer = async (
  request: ExportRequest & { textOverlayPngBase64: string; templatesDir?: string },
): Promise<Buffer> => {
  if (!request.template.backgroundImagePath) {
    throw new Error("Nu ai ales fundalul template-ului.");
  }
  if (!request.product.productImagePath) {
    throw new Error("Nu ai ales poza produsului.");
  }
  if (!request.textOverlayPngBase64) {
    throw new Error("Overlay-ul text lipseste. Reincarca aplicatia si incearca din nou.");
  }

  const output = exportOutputSize(request.template.width, request.template.height);
  const s = EXPORT_OUTPUT_SCALE;

  const productImageSource = getDisplayProductImagePath(request.product);
  const productInput = request.productImageBase64
    ? Buffer.from(request.productImageBase64, "base64")
    : productImageSource;

  const productMeta = await sharp(productInput).metadata();
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
  const backgroundPath = await resolveBackgroundPath(
    request.template.backgroundImagePath,
    request.templatesDir,
  );
  const backgroundLayer = await composeBackgroundLayer(
    backgroundPath,
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
