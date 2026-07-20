import sharp from "sharp";
import {
  FACEBOOK_JPEG_QUALITY,
  FACEBOOK_MAX_LONG_EDGE,
  FACEBOOK_PNG_MAX_BYTES,
  facebookTargetSize,
} from "../shared/facebookImage.js";

export interface PreparedFacebookImage {
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
  width: number;
  height: number;
}

/**
 * Prepares a composed post image for Facebook Graph API upload:
 * - longest edge ≤ 2048 (you resize, not Facebook)
 * - light sharpen after downscale
 * - PNG if ≤ ~1MB (Meta recommendation), else JPEG q92
 */
export const prepareForFacebook = async (input: Buffer): Promise<PreparedFacebookImage> => {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Imaginea pentru Facebook nu are dimensiuni valide.");
  }

  const target = facebookTargetSize(sourceWidth, sourceHeight, FACEBOOK_MAX_LONG_EDGE);
  let pipeline = sharp(input, { failOn: "none" });

  if (target.scale < 1) {
    pipeline = pipeline.resize(target.width, target.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
  }

  // Mild output sharpen — compensates Facebook CDN soft recompression.
  pipeline = pipeline.sharpen({ sigma: 0.7, m1: 0.9, m2: 0.5 });

  const pngBuffer = await pipeline
    .clone()
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();

  if (pngBuffer.length <= FACEBOOK_PNG_MAX_BYTES) {
    return {
      buffer: pngBuffer,
      mimeType: "image/png",
      width: target.width,
      height: target.height,
    };
  }

  const jpegBuffer = await pipeline
    .clone()
    .jpeg({ quality: FACEBOOK_JPEG_QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();

  return {
    buffer: jpegBuffer,
    mimeType: "image/jpeg",
    width: target.width,
    height: target.height,
  };
};
