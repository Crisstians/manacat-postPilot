import { useEffect, useRef, useState, type RefObject } from "react";

const MIN_FIT_SCALE = 0.08;
const MIN_USER_ZOOM = 0.5;
const MAX_USER_ZOOM = 4;
const ZOOM_SENSITIVITY = 0.0018;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const readContentBox = (node: HTMLElement) => {
  const style = getComputedStyle(node);
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padTop = parseFloat(style.paddingTop) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  return {
    padLeft,
    padTop,
    availW: node.clientWidth - padLeft - padRight,
    availH: node.clientHeight - padTop - padBottom,
  };
};

/**
 * Fits the template into a preview container, then zooms with the mouse wheel
 * toward the cursor position (not the viewport center). Export resolution is unaffected.
 */
export function usePreviewZoom(
  containerRef: RefObject<HTMLElement | null>,
  templateWidth: number,
  templateHeight: number,
) {
  const [fitScale, setFitScale] = useState<number | null>(null);
  const [userZoom, setUserZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const fitScaleRef = useRef(fitScale);
  const userZoomRef = useRef(userZoom);
  const panRef = useRef(pan);
  fitScaleRef.current = fitScale;
  userZoomRef.current = userZoom;
  panRef.current = pan;

  const centerPan = (
    nextFit: number,
    nextZoom: number,
    availW: number,
    availH: number,
    padLeft: number,
    padTop: number,
  ) => {
    const width = templateWidth * nextFit * nextZoom;
    const height = templateHeight * nextFit * nextZoom;
    return {
      x: padLeft + (availW - width) / 2,
      y: padTop + (availH - height) / 2,
    };
  };

  useEffect(() => {
    setUserZoom(1);
    const node = containerRef.current;
    if (!node) {
      setPan({ x: 0, y: 0 });
      return;
    }
    const box = readContentBox(node);
    const nextFit = Math.max(
      MIN_FIT_SCALE,
      Math.min(box.availW / templateWidth, box.availH / templateHeight),
    );
    setFitScale(nextFit);
    setPan(centerPan(nextFit, 1, box.availW, box.availH, box.padLeft, box.padTop));
  }, [containerRef, templateHeight, templateWidth]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateFitScale = () => {
      const box = readContentBox(node);
      if (box.availW <= 0 || box.availH <= 0) return;
      const nextFit = Math.max(
        MIN_FIT_SCALE,
        Math.min(box.availW / templateWidth, box.availH / templateHeight),
      );
      const prevFit = fitScaleRef.current;
      if (prevFit !== null && Math.abs(prevFit - nextFit) < 0.001) {
        if (Math.abs(userZoomRef.current - 1) <= 0.02) {
          setPan(centerPan(nextFit, 1, box.availW, box.availH, box.padLeft, box.padTop));
        }
        return;
      }

      setFitScale(nextFit);
      if (prevFit === null || Math.abs(userZoomRef.current - 1) <= 0.02) {
        setPan(centerPan(nextFit, userZoomRef.current, box.availW, box.availH, box.padLeft, box.padTop));
      } else {
        const ratio = nextFit / (prevFit || nextFit);
        setPan((current) => ({ x: current.x * ratio, y: current.y * ratio }));
      }
    };

    updateFitScale();
    const observer = new ResizeObserver(updateFitScale);
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef, templateHeight, templateWidth]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const currentFit = fitScaleRef.current;
      if (currentFit === null) return;

      const oldZoom = userZoomRef.current;
      const factor = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
      const newZoom = clamp(oldZoom * factor, MIN_USER_ZOOM, MAX_USER_ZOOM);
      if (Math.abs(newZoom - oldZoom) < 0.0001) return;

      const rect = node.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - node.clientLeft;
      const mouseY = event.clientY - rect.top - node.clientTop;
      const ratio = newZoom / oldZoom;
      const currentPan = panRef.current;

      // Keep the content point under the cursor fixed while zooming.
      const nextPan = {
        x: mouseX - (mouseX - currentPan.x) * ratio,
        y: mouseY - (mouseY - currentPan.y) * ratio,
      };

      userZoomRef.current = newZoom;
      panRef.current = nextPan;
      setUserZoom(newZoom);
      setPan(nextPan);
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [containerRef]);

  const resetZoom = () => {
    const node = containerRef.current;
    const currentFit = fitScaleRef.current;
    if (!node || currentFit === null) {
      setUserZoom(1);
      return;
    }
    const box = readContentBox(node);
    const nextPan = centerPan(currentFit, 1, box.availW, box.availH, box.padLeft, box.padTop);
    userZoomRef.current = 1;
    panRef.current = nextPan;
    setUserZoom(1);
    setPan(nextPan);
  };

  const scale = fitScale === null ? null : fitScale * userZoom;
  const zoomPercent = Math.round(userZoom * 100);
  const isZoomed = Math.abs(userZoom - 1) > 0.02;

  return {
    scale,
    pan,
    userZoom,
    zoomPercent,
    isZoomed,
    resetZoom,
  };
}
