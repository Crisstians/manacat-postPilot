import { useEffect, useState } from "react";

export const useKonvaImage = (src: string | undefined): HTMLImageElement | undefined => {
  const [image, setImage] = useState<HTMLImageElement | undefined>();

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }

    const element = new window.Image();
    element.crossOrigin = "anonymous";
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
