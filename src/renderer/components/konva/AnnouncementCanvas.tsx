import Konva from "konva";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Image, Layer, Stage } from "react-konva";
import {
  getAnnouncementLayout,
  type AnnouncementDraft,
  type HiringAnnouncementInput,
  type ShopAnnouncementInput,
} from "../../../shared/announcementTypes";
import type { TemplateTextBlockId, TextBlockGeometry } from "../../../shared/types";
import { resolveTemplateImageSource } from "../../templateImageSource";
import { EditableTextBlock } from "./EditableTextBlock";
import { FitText } from "./FitText";
import { EXPORT_PIXEL_RATIO } from "./textStyles";
import { useKonvaImageFromSrc } from "./useKonvaImage";

export interface AnnouncementCanvasHandle {
  exportFullImage: () => Promise<string | null>;
}

interface AnnouncementCanvasProps {
  draft: AnnouncementDraft;
  previewScale?: number;
  onTextBlockLayoutChange?: (blockId: TemplateTextBlockId, geometry: TextBlockGeometry) => void;
}

type TextSelection = TemplateTextBlockId | null;

const getPreviewPixelRatio = (): number => {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
};

const applyPreviewStageSizing = (
  stage: Konva.Stage,
  template: { width: number; height: number },
  previewScale: number,
) => {
  stage.scale({ x: previewScale, y: previewScale });
  stage.size({
    width: template.width * previewScale,
    height: template.height * previewScale,
  });
  stage.getLayers().forEach((layer) => {
    layer.getCanvas().setPixelRatio(getPreviewPixelRatio());
  });
};

const applyExportStageSizing = (
  stage: Konva.Stage,
  template: { width: number; height: number },
) => {
  stage.scale({ x: 1, y: 1 });
  stage.size({ width: template.width, height: template.height });
  stage.getLayers().forEach((layer) => {
    layer.getCanvas().setPixelRatio(EXPORT_PIXEL_RATIO);
  });
};

const isInteractiveTextTarget = (target: Konva.Node): boolean => {
  const name = target.name() ?? "";
  if (name.startsWith("text-block-") || name.startsWith("text-hit-")) {
    return true;
  }

  let parent = target.getParent();
  while (parent) {
    if (parent.className === "Transformer") {
      return true;
    }
    const parentName = parent.name() ?? "";
    if (parentName.startsWith("text-block-")) {
      return true;
    }
    parent = parent.getParent();
  }

  return false;
};

export const AnnouncementCanvas = forwardRef<AnnouncementCanvasHandle, AnnouncementCanvasProps>(
  function AnnouncementCanvas({ draft, previewScale = 1, onTextBlockLayoutChange }, ref) {
    const stageRef = useRef<Konva.Stage>(null);
    const [selection, setSelection] = useState<TextSelection>(null);
    const { template } = draft;
    const backgroundSrc = template.backgroundImagePath
      ? resolveTemplateImageSource(template.backgroundImagePath)
      : undefined;
    const backgroundImage = useKonvaImageFromSrc(backgroundSrc);
    const shopLayout = useMemo(
      () =>
        draft.postType === "shop"
          ? getAnnouncementLayout("shop", template.textBlocks)
          : null,
      [draft.postType, template.textBlocks],
    );
    const hiringLayout = useMemo(
      () =>
        draft.postType === "hiring"
          ? getAnnouncementLayout("hiring", template.textBlocks)
          : null,
      [draft.postType, template.textBlocks],
    );
    const interactiveText = Boolean(onTextBlockLayoutChange);

    useImperativeHandle(ref, () => ({
      exportFullImage: async () => {
        const stage = stageRef.current;
        if (!stage) return null;
        flushSync(() => setSelection(null));
        applyExportStageSizing(stage, template);
        stage.draw();
        const dataUrl = stage.toDataURL({
          pixelRatio: EXPORT_PIXEL_RATIO,
          mimeType: "image/png",
        });
        applyPreviewStageSizing(stage, template, previewScale);
        stage.draw();
        return dataUrl;
      },
    }));

    const shopContent =
      draft.postType === "shop" ? (draft.content as ShopAnnouncementInput) : null;
    const hiringContent =
      draft.postType === "hiring" ? (draft.content as HiringAnnouncementInput) : null;

    const handleStagePointerDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!interactiveText) return;
      if (isInteractiveTextTarget(event.target)) return;
      setSelection(null);
    };

    const onTextGeometry = (blockId: TemplateTextBlockId) => (geometry: TextBlockGeometry) => {
      onTextBlockLayoutChange?.(blockId, geometry);
    };

    return (
      <Stage
        ref={stageRef}
        width={template.width * previewScale}
        height={template.height * previewScale}
        scaleX={previewScale}
        scaleY={previewScale}
        onMouseDown={handleStagePointerDown}
        onTouchStart={handleStagePointerDown}
      >
        <Layer>
          {backgroundImage ? (
            <Image
              image={backgroundImage}
              width={template.width}
              height={template.height}
              imageSmoothingEnabled
            />
          ) : null}
        </Layer>

        <Layer>
          {shopLayout && shopContent ? (
            <>
              <EditableTextBlock
                block={shopLayout.title}
                text={shopContent.title || "Titlu anunț"}
                selected={selection === "productName"}
                interactive={interactiveText}
                canvasWidth={template.width}
                canvasHeight={template.height}
                onSelect={() => setSelection("productName")}
                onLayoutChange={onTextGeometry("productName")}
              />
              <EditableTextBlock
                block={shopLayout.highlight}
                text={shopContent.highlight || "Subtitlu"}
                selected={selection === "subtitle"}
                interactive={interactiveText}
                canvasWidth={template.width}
                canvasHeight={template.height}
                onSelect={() => setSelection("subtitle")}
                onLayoutChange={onTextGeometry("subtitle")}
              />
              <EditableTextBlock
                block={shopLayout.body}
                text={shopContent.message || "Mesaj anunț"}
                selected={selection === "description"}
                interactive={interactiveText}
                canvasWidth={template.width}
                canvasHeight={template.height}
                onSelect={() => setSelection("description")}
                onLayoutChange={onTextGeometry("description")}
              />
              <FitText block={shopLayout.footer} text={shopContent.footer || "Footer anunț"} />
            </>
          ) : null}

          {hiringLayout && hiringContent ? (
            <>
              <EditableTextBlock
                block={hiringLayout.title}
                text={hiringContent.jobTitle || "Post vacant"}
                selected={selection === "productName"}
                interactive={interactiveText}
                canvasWidth={template.width}
                canvasHeight={template.height}
                onSelect={() => setSelection("productName")}
                onLayoutChange={onTextGeometry("productName")}
              />
              <EditableTextBlock
                block={hiringLayout.subtitle}
                text={hiringContent.subtitle || "Echipa Manacat"}
                selected={selection === "subtitle"}
                interactive={interactiveText}
                canvasWidth={template.width}
                canvasHeight={template.height}
                onSelect={() => setSelection("subtitle")}
                onLayoutChange={onTextGeometry("subtitle")}
              />
              <EditableTextBlock
                block={hiringLayout.body}
                text={hiringContent.requirements || "Cerințe job"}
                selected={selection === "description"}
                interactive={interactiveText}
                canvasWidth={template.width}
                canvasHeight={template.height}
                onSelect={() => setSelection("description")}
                onLayoutChange={onTextGeometry("description")}
              />
              <FitText block={hiringLayout.footer} text={hiringContent.applyLine || "Aplică acum"} />
            </>
          ) : null}
        </Layer>
      </Stage>
    );
  },
);
