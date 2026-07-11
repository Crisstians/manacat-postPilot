import { Badge } from "flowbite-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import type { LayerRect, ProductInput, TemplateLayout } from "../../shared/types";
import { PostCanvas, type PostCanvasHandle } from "./konva/PostCanvas";

interface CanvasPreviewProps {
  product: ProductInput;
  template: TemplateLayout;
  onProductImageLayoutChange?: (layout: LayerRect) => void;
}

export const CanvasPreview = forwardRef<PostCanvasHandle, CanvasPreviewProps>(function CanvasPreview(
  { product, template, onProductImageLayoutChange },
  ref,
) {
  const hasBackground = Boolean(template.backgroundImagePath);
  const hasProductImage = Boolean(product.productImagePath);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const scaledWidth = template.width * scale;
  const scaledHeight = template.height * scale;

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;

    const updateScale = () => {
      const widthScale = node.clientWidth / template.width;
      const heightScale = node.clientHeight / template.height;
      const nextScale = Math.max(0.05, Math.min(widthScale, heightScale));
      setScale(nextScale);
    };

    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(node);
    return () => observer.disconnect();
  }, [template.height, template.width]);

  return (
    <div className="flex h-full min-h-0 flex-col pt-1">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-700">Previzualizare postare</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {template.width} × {template.height}px
          </p>
          {hasProductImage ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Apasă pe poza produsului pentru a o selecta, muta sau redimensiona.
            </p>
          ) : null}
        </div>
        <Badge color={hasBackground && hasProductImage ? "success" : "warning"}>
          {hasBackground && hasProductImage ? "Ready export" : "Incomplet"}
        </Badge>
      </div>

      <div
        ref={previewRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      >
        <div
          className="relative overflow-hidden rounded-xl border border-orange-100 bg-orange-50/60"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
          }}
        >
          <PostCanvas
            ref={ref}
            product={product}
            template={template}
            previewScale={scale}
            onProductImageLayoutChange={onProductImageLayoutChange}
          />
        </div>
      </div>
    </div>
  );
});
