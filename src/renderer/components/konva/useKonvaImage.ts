import { useEffect, useState } from "react";
import { resolveProductImageSource } from "../../productImageSource";

export const useKonvaImage = (src: string | undefined): HTMLImageElement | undefined => {
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  const resolvedSrc = src ? resolveProductImageSource(src) : undefined;

  useEffect(() => {
    if (!resolvedSrc) {
      setImage(undefined);
      return;
    }

    const element = new window.Image();
    if (/^https?:/.test(resolvedSrc)) {
      element.crossOrigin = "anonymous";
    }
    element.onload = () => setImage(element);
    element.onerror = () => setImage(undefined);
    element.src = resolvedSrc;

    return () => {
      element.onload = null;
      element.onerror = null;
    };
  }, [resolvedSrc]);

  return image;
};
