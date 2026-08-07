import { forwardRef, useMemo, useRef } from "react";
import { EXPORT_REQUIREMENTS, isExportReady } from "../../shared/exportReadiness";
import type {
  LayerRect,
  ProductInput,
  TemplateLayout,
  TemplateTextBlockId,
  TextBlockGeometry,
} from "../../shared/types";
import { usePreviewZoom } from "../hooks/usePreviewZoom";
import type { InlineEditableField } from "./konva/CanvasInlineTextEditor";
import { PostCanvas, type PostCanvasHandle } from "./konva/PostCanvas";

interface CanvasPreviewProps {
  product: ProductInput;
  template: TemplateLayout;
  onProductImageLayoutChange?: (layout: LayerRect) => void;
  onTextBlockLayoutChange?: (blockId: TemplateTextBlockId, geometry: TextBlockGeometry) => void;
  onTextContentChange?: (field: InlineEditableField, value: string) => void;
  onNavigateField?: (fieldKey: string) => void;
}

export const CanvasPreview = forwardRef<PostCanvasHandle, CanvasPreviewProps>(function CanvasPreview(
  {
    product,
    template,
    onProductImageLayoutChange,
    onTextBlockLayoutChange,
    onTextContentChange,
    onNavigateField,
  },
  ref,
) {
  const hasProductImage = Boolean(product.productImagePath);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { scale, pan, zoomPercent, isZoomed, isPanning, startPan, resetZoom } = usePreviewZoom(
    previewRef,
    template.width,
    template.height,
  );
  const ready = isExportReady(product, template);
  const scaledWidth = scale === null ? 0 : template.width * scale;
  const scaledHeight = scale === null ? 0 : template.height * scale;

  const missingItems = useMemo(
    () =>
      EXPORT_REQUIREMENTS.filter((field) => !field.check(product, template)).map((field) => ({
        key: field.key,
        label: field.label,
      })),
    [product, template],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col pt-3">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Previzualizare postare
          </h2>
          <p className="mt-0.5 text-[11px] text-base-content/50">
            {template.width} × {template.height}px
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isZoomed ? (
            <button
              type="button"
              onClick={resetZoom}
              className="inline-flex h-7 min-h-0 items-center rounded-full border border-base-300/80 bg-base-100 px-2.5 text-[11px] font-semibold text-base-content shadow-sm transition hover:border-primary/40 hover:text-primary"
              title="Resetează zoom"
            >
              {zoomPercent}%
            </button>
          ) : (
            <span className="inline-flex h-7 items-center rounded-full border border-base-300/70 bg-base-100 px-2.5 text-[11px] font-semibold text-base-content/75">
              {zoomPercent}%
            </span>
          )}
          <span
            className={`badge badge-sm shrink-0 ${
              ready ? "badge-soft badge-success" : "badge-soft badge-warning"
            }`}
          >
            {ready ? "Gata export" : "Incomplet"}
          </span>
        </div>
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
        className={`preview-stage preview-stage-scroll app-scroll relative min-h-[280px] w-full min-w-0 flex-1 overflow-hidden rounded-xl border border-base-300/60 p-2 md:min-h-[340px] md:p-3 xl:min-h-0 ${
          isPanning ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
        title="Scroll pentru zoom · ține click pentru a muta preview-ul"
      >
        {scale !== null ? (
          <div
            className="absolute overflow-hidden rounded-lg shadow-sm ring-1 ring-base-300/50"
            style={{
              left: `${pan.x}px`,
              top: `${pan.y}px`,
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
              onTextContentChange={onTextContentChange}
              onViewportPanStart={startPan}
            />
          </div>
        ) : null}
      </div>

      <p className="helper-text mt-2 shrink-0 text-center text-[11px]">
        {hasProductImage
          ? "Scroll pentru zoom · ține click pe fundal ca să muți preview-ul. Click pe text ca să-l selectezi, trage ca să-l muți, dublu-click ca să editezi."
          : "Scroll pentru zoom · ține click pe fundal ca să muți preview-ul. Click pe text ca să-l selectezi, trage ca să-l muți, dublu-click ca să editezi."}
      </p>
    </div>
  );
});
