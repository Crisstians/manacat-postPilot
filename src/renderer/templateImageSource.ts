import { resolveProductImageSource } from "../shared/productImage";

const bundledTemplateModules = import.meta.glob(
  "../assets/templatesPostari/*.{png,jpg,jpeg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const bundledTemplateUrlById = new Map(
  Object.entries(bundledTemplateModules).map(([key, url]) => {
    const filename = key.split("/").pop() ?? key;
    const id = filename.replace(/\.[^.]+$/, "");
    return [id, url];
  }),
);

export const getTemplateIdFromPath = (imagePath: string): string => {
  const filename = imagePath.split(/[/\\]/).pop() ?? imagePath;
  return filename.replace(/\.[^.]+$/, "");
};

const safeToFileUrl = (
  imagePath: string,
  toFileUrl?: (filePath: string) => string,
): string | undefined => {
  if (!toFileUrl) return undefined;
  try {
    return toFileUrl(imagePath);
  } catch {
    return undefined;
  }
};

export const resolveTemplateImageSource = (imagePath: string): string => {
  const trimmed = imagePath.trim();
  if (/^(https?:|blob:|data:)/i.test(trimmed)) {
    return trimmed;
  }

  const bundledUrl = bundledTemplateUrlById.get(getTemplateIdFromPath(trimmed));
  if (bundledUrl) {
    return bundledUrl;
  }

  const fileUrl = safeToFileUrl(trimmed, window.manacatApi?.toFileUrl);
  if (fileUrl) {
    return fileUrl;
  }

  return resolveProductImageSource(trimmed, window.manacatApi?.toFileUrl);
};
