import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { EXPORT_REQUIREMENTS, isExportReady } from "../../shared/exportReadiness";
import type {
  LayerRect,
  ProductInput,
  TemplateLayout,
  TemplateTextBlockId,
  TextBlockGeometry,
} from "../../shared/types";
import { PostCanvas, type PostCanvasHandle } from "./konva/PostCanvas";

interface CanvasPreviewProps {
  product: ProductInput;
  template: TemplateLayout;
  onProductImageLayoutChange?: (layout: LayerRect) => void;
  onTextBlockLayoutChange?: (blockId: TemplateTextBlockId, geometry: TextBlockGeometry) => void;
  onNavigateField?: (fieldKey: string) => void;
}

const MIN_PREVIEW_SCALE = 0.08;

export const CanvasPreview = forwardRef<PostCanvasHandle, CanvasPreviewProps>(function CanvasPreview(
  { product, template, onProductImageLayoutChange, onTextBlockLayoutChange, onNavigateField },
  ref,
) {
  const hasProductImage = Boolean(product.productImagePath);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const scaledWidth = template.width * scale;
  const scaledHeight = template.height * scale;
  const ready = isExportReady(product, template);

  const missingItems = useMemo(
    () =>
      EXPORT_REQUIREMENTS.filter((field) => !field.check(product, template)).map((field) => ({
        key: field.key,
        label: field.label,
      })),
    [product, template],
  );

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;

    const updateScale = () => {
      const widthScale = node.clientWidth / template.width;
      const heightScale = node.clientHeight / template.height;
      const nextScale = Math.max(MIN_PREVIEW_SCALE, Math.min(widthScale, heightScale));
      setScale(nextScale);
    };

    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(node);
    return () => observer.disconnect();
  }, [template.height, template.width]);

  return (
    <div className="flex h-full min-h-0 flex-col pt-3">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Previzualizare postare
          </h2>
          <p className="mt-0.5 text-[11px] text-base-content/50">
            {template.width} × {template.height}px
          </p>
        </div>
        <span
          className={`badge badge-sm shrink-0 ${
            ready ? "badge-soft badge-success" : "badge-soft badge-warning"
          }`}
        >
          {ready ? "Gata export" : "Incomplet"}
        </span>
      </div>

      {!ready ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-base-content/40">Lipsesc:</span>
          {missingItems.map((item) =>
            onNavigateField ? (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigateField(item.key)}
                className="inline-flex items-center gap-1 rounded-full border border-base-300/70 bg-base-100 px-2 py-0.5 text-[11px] text-base-content/70 transition hover:border-primary/40 hover:text-primary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
                {item.label}
              </button>
            ) : (
              <span
                key={item.key}
                className="inline-flex items-center gap-1 text-[11px] text-base-content/50"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-base-300" aria-hidden="true" />
                {item.label}
              </span>
            ),
          )}
        </div>
      ) : null}

      <div
        ref={previewRef}
        className="preview-stage preview-stage-scroll app-scroll relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-base-300/60 p-2 md:min-h-[340px] md:p-3 xl:min-h-0"
      >
        <div
          className="relative shrink-0 overflow-hidden rounded-lg border border-base-300/50 shadow-sm"
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
            onTextBlockLayoutChange={onTextBlockLayoutChange}
          />
        </div>
      </div>

      <p className="helper-text mt-2 shrink-0 text-center text-[11px]">
        {hasProductImage
          ? "Apasă pe text sau pe poza produsului pentru a muta sau redimensiona."
          : "Apasă pe text pentru a muta sau redimensiona box-ul."}
      </p>
    </div>
  );
});
