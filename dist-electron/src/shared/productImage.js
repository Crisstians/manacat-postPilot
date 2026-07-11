export const getDisplayProductImagePath = (product) => product.productImageProcessedPath ?? product.productImagePath;
export const hasRemovedBackground = (product) => Boolean(product.productImageProcessedPath);
export const revokeBlobUrl = (url) => {
    if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
    }
};
export const needsBase64Export = (source) => source.startsWith("blob:") || source.startsWith("data:");
const isWebImagePath = (imagePath) => /^(blob:|data:|https?:|manacat:)/.test(imagePath) ||
    imagePath.startsWith("./") ||
    imagePath.startsWith("/assets/") ||
    imagePath.startsWith("/src/") ||
    imagePath.startsWith("/@");
export const fileUrlToPath = (imagePath) => {
    if (!imagePath.startsWith("file://")) {
        return imagePath;
    }
    let pathname = decodeURIComponent(imagePath.replace(/^file:\/\//, ""));
    if (/^\/[A-Za-z]:/.test(pathname)) {
        pathname = pathname.slice(1);
    }
    return pathname;
};
export const resolveProductImageSource = (imagePath, toFileUrl) => {
    if (isWebImagePath(imagePath)) {
        return imagePath;
    }
    const localPath = fileUrlToPath(imagePath);
    if (toFileUrl) {
        try {
            return toFileUrl(localPath);
        }
        catch {
            return localPath;
        }
    }
    return localPath;
};
export const imageSourceToBase64 = async (source) => {
    const response = await fetch(source);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index] ?? 0);
    }
    return btoa(binary);
};
