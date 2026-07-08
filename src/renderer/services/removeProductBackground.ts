import { resolveProductImageSource } from "../productImageSource";

export interface BackgroundRemovalProgress {
  percent: number;
  label: string;
}

export const removeProductBackground = async (
  imagePath: string,
  onProgress?: (progress: BackgroundRemovalProgress) => void,
): Promise<string> => {
  const { removeBackground } = await import("@imgly/background-removal");
  const imageSource = resolveProductImageSource(imagePath);

  const blob = await removeBackground(imageSource, {
    model: "isnet_quint8",
    output: {
      format: "image/png",
    },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress || total <= 0) return;
      onProgress({
        percent: Math.round((current / total) * 100),
        label: key,
      });
    },
  });

  return URL.createObjectURL(blob);
};
