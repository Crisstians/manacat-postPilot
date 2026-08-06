import { resolveProductImageSource } from "../productImageSource";
import { removeBackground } from "../../services/removeBackgroundApi";

export interface BackgroundRemovalProgress {
  percent: number;
  label: string;
}

/**
 * Removes product background via Manacat API (`POST /api/v1/remove-background`).
 */
export const removeProductBackground = async (
  imagePath: string,
  accessToken: string,
  onProgress?: (progress: BackgroundRemovalProgress) => void,
): Promise<string> => {
  if (!accessToken.trim()) {
    throw new Error("Trebuie să fii autentificat pentru a elimina fundalul.");
  }

  onProgress?.({ percent: 15, label: "Pregătim imaginea..." });

  const trimmed = imagePath.trim();
  onProgress?.({ percent: 45, label: "Apelăm API-ul..." });

  let pngBlob: Blob;
  if (/^https?:\/\//i.test(trimmed)) {
    pngBlob = await removeBackground({
      accessToken,
      imageUrl: trimmed,
      size: "auto",
    });
  } else {
    const imageSource = resolveProductImageSource(trimmed);
    const response = await fetch(imageSource);
    if (!response.ok) {
      throw new Error("Nu s-a putut citi imaginea produsului.");
    }
    const imageBlob = await response.blob();
    pngBlob = await removeBackground({
      accessToken,
      image: imageBlob,
      size: "auto",
    });
  }

  onProgress?.({ percent: 100, label: "Gata" });
  return URL.createObjectURL(pngBlob);
};
