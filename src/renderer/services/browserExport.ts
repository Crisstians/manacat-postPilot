const defaultFileName = (productName: string): string => {
  const slug = productName.trim().replace(/\s+/g, "-").toLowerCase();
  return `${slug || "postare-manacat"}.png`;
};

export const savePngInBrowser = async (
  dataUrl: string,
  productName: string,
): Promise<{ success: boolean; fileName?: string; error?: string }> => {
  const suggestedName = defaultFileName(productName);
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: "PNG Image", accept: { "image/png": [".png"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { success: true, fileName: handle.name };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { success: false, error: "Export anulat." };
      }
      throw error;
    }
  }

  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(objectUrl);
  return { success: true, fileName: suggestedName };
};
