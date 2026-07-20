import { useEffect, useState } from "react";
import { resolveProductImageSource } from "../../productImageSource";

const needsCrossOrigin = (src: string): boolean =>
  /^(https?:|manacat:|blob:|data:)/.test(src);

export const useKonvaImageFromSrc = (src: string | undefined): HTMLImageElement | undefined => {
  const [image, setImage] = useState<HTMLImageElement | undefined>();

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }

    const element = new window.Image();
    if (needsCrossOrigin(src)) {
      element.crossOrigin = "anonymous";
    }
    element.onload = () => setImage(element);
    element.onerror = () => setImage(undefined);
    element.src = src;

    return () => {
      element.onload = null;
      element.onerror = null;
    };
  }, [src]);

  return image;
};

export const useKonvaImage = (path: string | undefined): HTMLImageElement | undefined => {
  const resolvedSrc = path ? resolveProductImageSource(path) : undefined;
  return useKonvaImageFromSrc(resolvedSrc);
};
