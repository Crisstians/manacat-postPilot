import { promises as fs } from "node:fs";
import sharp from "sharp";
import { getDisplayProductImagePath } from "../shared/productImage.js";
import type { ExportJob, ExportResult } from "../shared/types.js";
import { resolveProductImageRect } from "./layout.js";

export const exportPostAssets = async (job: ExportJob): Promise<ExportResult> => {
  try {
    if (!job.template.backgroundImagePath) {
      throw new Error("Nu ai ales fundalul template-ului.");
    }
    if (!job.product.productImagePath) {
      throw new Error("Nu ai ales poza produsului.");
    }
    if (!job.textOverlayPngBase64) {
      throw new Error("Overlay-ul text lipseste. Reincarca aplicatia si incearca din nou.");
    }

    const productImageSource = getDisplayProductImagePath(job.product);
    const productInput = job.productImageBase64
      ? Buffer.from(job.productImageBase64, "base64")
      : productImageSource;

    const productMeta = await sharp(productInput).metadata();
    const fitted = resolveProductImageRect(
      productMeta.width ?? job.template.productLayer.width,
      productMeta.height ?? job.template.productLayer.height,
      job.template.productLayer,
      job.product.productImageLayout,
    );

    const productLayer = await sharp(productInput)
      .resize(Math.round(fitted.width), Math.round(fitted.height), { fit: "contain" })
      .png()
      .toBuffer();

    const shadowEnabled = Boolean(job.product.productImageProcessedPath);
    const scale = job.template.productLayer.height > 0 ? fitted.height / job.template.productLayer.height : 1;
    const shadowBlur = Math.round(22 * scale);
    const shadowOffsetY = Math.round(8 * scale);
    const shadowOpacity = 0.35;

    const shadowLayer = shadowEnabled
      ? await sharp(productLayer)
          .ensureAlpha()
          .blur(shadowBlur)
          .tint("#000")
          // Reduces alpha overall by scaling all channels (RGB is already black).
          .linear(shadowOpacity, 0)
          .png()
          .toBuffer()
      : null;

    const textOverlay = Buffer.from(job.textOverlayPngBase64, "base64");

    await sharp(job.template.backgroundImagePath)
      .resize(job.template.width, job.template.height, { fit: "cover" })
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
      .toFile(job.outputImagePath);

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
