import Konva from "konva";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Image, Layer, Stage } from "react-konva";
import {
  getAnnouncementLayout,
  type AnnouncementDraft,
  type HiringAnnouncementInput,
  type ShopAnnouncementInput,
} from "../../../shared/announcementTypes";
import { resolveTemplateImageSource } from "../../templateImageSource";
import { FitText } from "./FitText";
import { EXPORT_PIXEL_RATIO } from "./textStyles";
import { useKonvaImageFromSrc } from "./useKonvaImage";

export interface AnnouncementCanvasHandle {
  exportFullImage: () => Promise<string | null>;
}

interface AnnouncementCanvasProps {
  draft: AnnouncementDraft;
  previewScale?: number;
}

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

export const AnnouncementCanvas = forwardRef<AnnouncementCanvasHandle, AnnouncementCanvasProps>(
  function AnnouncementCanvas({ draft, previewScale = 1 }, ref) {
    const stageRef = useRef<Konva.Stage>(null);
    const { template } = draft;
    const backgroundSrc = template.backgroundImagePath
      ? resolveTemplateImageSource(template.backgroundImagePath)
      : undefined;
    const backgroundImage = useKonvaImageFromSrc(backgroundSrc);
    const layout = useMemo(() => getAnnouncementLayout(draft.postType), [draft.postType]);

    useImperativeHandle(ref, () => ({
      exportFullImage: async () => {
        const stage = stageRef.current;
        if (!stage) return null;
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

    return (
      <Stage
        ref={stageRef}
        width={template.width * previewScale}
        height={template.height * previewScale}
        onMouseDown={(event) => {
          if (event.target === event.target.getStage()) {
            event.target.getStage()?.container().blur();
          }
        }}
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
          {draft.postType === "shop" && shopContent ? (
            <>
              <FitText block={layout.title} text={shopContent.title || "Titlu anunț"} />
              {"highlight" in layout ? (
                <FitText block={layout.highlight} text={shopContent.highlight || "Subtitlu"} />
              ) : null}
              <FitText block={layout.body} text={shopContent.message || "Mesaj anunț"} />
              <FitText block={layout.footer} text={shopContent.footer || "Footer anunț"} />
            </>
          ) : null}

          {draft.postType === "hiring" && hiringContent ? (
            <>
              <FitText block={layout.title} text={hiringContent.jobTitle || "Post vacant"} />
              {"subtitle" in layout ? (
                <FitText block={layout.subtitle} text={hiringContent.subtitle || "Echipa Manacat"} />
              ) : null}
              <FitText
                block={layout.body}
                text={hiringContent.requirements || "Cerințe job"}
              />
              <FitText block={layout.footer} text={hiringContent.applyLine || "Aplică acum"} />
            </>
          ) : null}
        </Layer>
      </Stage>
    );
  },
);
