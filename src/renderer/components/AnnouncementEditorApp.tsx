import { Download, FileText, LayoutTemplate, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { publishPost } from "../../services/postsApi";
import { createEmptyAnnouncementSession } from "../../shared/announcementStorage";
import {
  generateAnnouncementCaption,
  getAnnouncementMissingLabels,
  isAnnouncementExportReady,
  type AnnouncementDraft,
} from "../../shared/announcementTypes";
import { openFacebookPostInBrowser } from "../../shared/facebookPostUrl";
import { getPostTypeDefinition, type AnnouncementPostType } from "../../shared/postTypes";
import { applyTextBlockGeometry } from "../../shared/textBlockLayout";
import type { TemplateTextBlockId, TextBlockGeometry } from "../../shared/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { usePreviewZoom } from "../hooks/usePreviewZoom";
import {
  loadAnnouncementSession,
  renderAnnouncementImageBlob,
  saveAnnouncementSession,
} from "../services/announcementPersistence";
import { savePngInBrowser } from "../services/browserExport";
import { ActionLoadingOverlay, type ActionLoadingState } from "./ActionLoadingOverlay";
import { AnnouncementForm, getAnnouncementDraftLabel } from "./AnnouncementForm";
import { AppHeader } from "./AppHeader";
import { CaptionEditor } from "./CaptionEditor";
import { AnnouncementCanvas, type AnnouncementCanvasHandle } from "./konva/AnnouncementCanvas";
import {
  ANNOUNCEMENT_PUBLISH_CHECKLIST,
  PublishConfirmModal,
} from "./PublishConfirmModal";
import { TemplateControls } from "./TemplateControls";

const bundledTemplateModules = import.meta.glob(
  "../../assets/templatesPostari/*.{png,jpg,jpeg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const firstBundledTemplatePath =
  Object.entries(bundledTemplateModules).sort(([left], [right]) => left.localeCompare(right, "ro"))[0]?.[1] ?? "";

interface AnnouncementEditorAppProps {
  postType: AnnouncementPostType;
  onBack: () => void;
}

export function AnnouncementEditorApp({ postType, onBack }: AnnouncementEditorAppProps) {
  const postTypeDef = getPostTypeDefinition(postType);
  const { user, accessToken, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const [{ session: initialSession, restored: sessionRestored }] = useState(() =>
    user?.id
      ? loadAnnouncementSession(user.id, postType, firstBundledTemplatePath)
      : {
          session: createEmptyAnnouncementSession(postType, firstBundledTemplatePath),
          restored: false,
        },
  );

  const [draft, setDraft] = useState(initialSession.draft);
  const [activePanel, setActivePanel] = useState<"content" | "template">(initialSession.activePanel);
  const [busy, setBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishPreviewUrls, setPublishPreviewUrls] = useState<string[]>([]);
  const [publishPreviewLoading, setPublishPreviewLoading] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showFieldHints, setShowFieldHints] = useState(false);
  const [actionLoading, setActionLoading] = useState<ActionLoadingState | null>(null);
  const previewRef = useRef<AnnouncementCanvasHandle>(null);
  const skipAutoSaveRef = useRef(true);
  const restoreToastShownRef = useRef(false);

  const exportReady = useMemo(() => isAnnouncementExportReady(draft), [draft]);
  const missingForExport = useMemo(() => getAnnouncementMissingLabels(draft), [draft]);
  const suggestedCaption = useMemo(() => generateAnnouncementCaption(draft), [draft]);
  const draftLabel = useMemo(() => getAnnouncementDraftLabel(draft), [draft]);

  useEffect(() => {
    if (exportReady) setShowFieldHints(false);
  }, [exportReady]);

  useEffect(() => {
    if (!sessionRestored || restoreToastShownRef.current) return;
    restoreToastShownRef.current = true;
    showSuccess("Draft restaurat automat.");
  }, [sessionRestored, showSuccess]);

  useEffect(() => {
    if (!user?.id) return;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      saveAnnouncementSession(user.id, postType, { activePanel, draft }, firstBundledTemplatePath);
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [user?.id, postType, activePanel, draft]);

  useEffect(() => {
    if (draft.facebookCaptionTouched) return;
    setDraft((current) =>
      current.facebookCaption === suggestedCaption
        ? current
        : { ...current, facebookCaption: suggestedCaption },
    );
  }, [suggestedCaption, draft.facebookCaptionTouched]);

  useEffect(() => {
    if (draft.template.backgroundImagePath || !firstBundledTemplatePath) return;
    setDraft((current) => ({
      ...current,
      template: { ...current.template, backgroundImagePath: firstBundledTemplatePath },
    }));
  }, []);

  const onTextBlockLayoutChange = (blockId: TemplateTextBlockId, geometry: TextBlockGeometry) => {
    setDraft((current) => ({
      ...current,
      template: {
        ...current.template,
        textBlocks: {
          ...current.template.textBlocks,
          [blockId]: applyTextBlockGeometry(current.template.textBlocks[blockId], geometry),
        },
      },
    }));
  };

  const onLogout = async () => {
    setLogoutBusy(true);
    try {
      await logout();
    } finally {
      setLogoutBusy(false);
    }
  };

  const onExport = async () => {
    if (!exportReady) {
      setShowFieldHints(true);
      showError(`Completează: ${missingForExport.join(", ")}`);
      return;
    }

    setBusy(true);
    setActionLoading({ variant: "export", stepIndex: 0, progress: 15, detail: draftLabel });

    try {
      setActionLoading({
        variant: "export",
        stepIndex: 1,
        progress: 48,
        detail: "Compunem graphic-ul anunțului...",
      });
      const dataUrl = await previewRef.current?.exportFullImage();
      if (!dataUrl) {
        showError("Nu s-a putut genera imaginea pentru export.");
        return;
      }

      setActionLoading({
        variant: "export",
        stepIndex: 2,
        progress: 82,
        detail: "Se salvează fișierul...",
      });
      const result = await savePngInBrowser(dataUrl, draftLabel);
      if (!result.success) {
        showError(result.error ?? "Export eșuat.");
        return;
      }
      showSuccess(`Imagine salvată: ${result.fileName}`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Export eșuat.");
    } finally {
      setActionLoading(null);
      setBusy(false);
    }
  };

  const onRequestPublish = async () => {
    if (!exportReady) {
      setShowFieldHints(true);
      showError(`Completează: ${missingForExport.join(", ")}`);
      return;
    }
    if (!accessToken) {
      showError("Sesiunea a expirat. Autentifică-te din nou.");
      return;
    }

    for (const url of publishPreviewUrls) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
    setPublishPreviewUrls([]);
    setPublishConfirmOpen(true);
    setPublishPreviewLoading(true);

    try {
      const dataUrl = await previewRef.current?.exportFullImage();
      if (dataUrl) {
        setPublishPreviewUrls([dataUrl]);
        return;
      }
      const image = await renderAnnouncementImageBlob(async () =>
        previewRef.current?.exportFullImage() ?? null,
      );
      if (image) {
        setPublishPreviewUrls([URL.createObjectURL(image)]);
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Nu s-a putut genera preview-ul pentru confirmare.",
      );
      setPublishConfirmOpen(false);
    } finally {
      setPublishPreviewLoading(false);
    }
  };

  const onPublish = async () => {
    if (!exportReady) {
      setShowFieldHints(true);
      showError(`Completează: ${missingForExport.join(", ")}`);
      return;
    }
    if (!accessToken) {
      showError("Sesiunea a expirat. Autentifică-te din nou.");
      return;
    }

    setPublishBusy(true);
    setActionLoading({ variant: "publish", stepIndex: 0, progress: 20, detail: draftLabel });

    try {
      const image = await renderAnnouncementImageBlob(async () =>
        previewRef.current?.exportFullImage() ?? null,
      );
      if (!image) {
        showError("Nu s-a putut genera imaginea pentru publicare.");
        return;
      }

      setActionLoading({ variant: "publish", stepIndex: 1, progress: 58, detail: "Caption pregătit" });
      const caption = draft.facebookCaption.trim() || suggestedCaption;
      setActionLoading({
        variant: "publish",
        stepIndex: 2,
        progress: 84,
        detail: "Se încarcă pe Facebook...",
      });
      const result = await publishPost(accessToken, image, caption);
      showSuccess(`Postare publicată pe Facebook (ID: ${result.facebookPostId}).`);
      setPublishConfirmOpen(false);
      for (const url of publishPreviewUrls) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
      setPublishPreviewUrls([]);
      await openFacebookPostInBrowser(result.facebookPostId);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Publicarea a eșuat.");
    } finally {
      setActionLoading(null);
      setPublishBusy(false);
    }
  };

  const actionBusy = busy || publishBusy;

  return (
    <main className="editor-shell flex flex-col bg-base-200 text-base-content">
      <ActionLoadingOverlay state={actionLoading} />
      <PublishConfirmModal
        open={publishConfirmOpen}
        title="Confirmă publicarea pe Facebook"
        caption={draft.facebookCaption.trim() || suggestedCaption}
        checklist={ANNOUNCEMENT_PUBLISH_CHECKLIST}
        previewUrls={publishPreviewUrls}
        previewLoading={publishPreviewLoading}
        confirmBusy={publishBusy}
        onCancel={() => {
          if (publishBusy) return;
          setPublishConfirmOpen(false);
          for (const url of publishPreviewUrls) {
            if (url.startsWith("blob:")) URL.revokeObjectURL(url);
          }
          setPublishPreviewUrls([]);
        }}
        onConfirm={() => void onPublish()}
      />
      <AppHeader
        onBack={onBack}
        subtitle={postTypeDef.label}
        onLogout={onLogout}
        logoutBusy={logoutBusy}
      />

      <div className="editor-shell-stack mx-auto grid w-full max-w-[1680px] flex-1 gap-4 p-4 xl:min-h-0 xl:grid-cols-12 xl:p-5">
        <section className="flex min-w-0 flex-col xl:col-span-5 xl:min-h-0">
          <div className="app-panel flex flex-1 flex-col xl:min-h-0 xl:overflow-hidden">
            <div className="shrink-0 border-b border-base-300/60 p-4 pb-3">
              <p className="app-section-title mb-3">{postTypeDef.label}</p>
              <div className="surface-muted grid grid-cols-2 gap-1.5 rounded-xl border border-base-300/60 p-1">
                <button
                  type="button"
                  onClick={() => setActivePanel("content")}
                  className={`panel-tab ${activePanel === "content" ? "panel-tab-active" : "panel-tab-idle"}`}
                >
                  <FileText size={14} />
                  Conținut
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel("template")}
                  className={`panel-tab ${activePanel === "template" ? "panel-tab-active" : "panel-tab-idle"}`}
                >
                  <LayoutTemplate size={14} />
                  Șablon
                </button>
              </div>
            </div>

            <div className="app-scroll min-h-0 flex-1 overflow-y-auto p-4">
              {activePanel === "content" ? (
                <AnnouncementForm
                  postType={postType}
                  content={draft.content}
                  onChange={(content) => setDraft((current) => ({ ...current, content }))}
                  showFieldHints={showFieldHints}
                />
              ) : (
                <TemplateControls
                  template={draft.template}
                  onChange={(template) =>
                    setDraft((current) => ({
                      ...current,
                      template,
                    }))
                  }
                />
              )}

              <div className="mt-4">
                <CaptionEditor
                  id={`${postType}-caption`}
                  label="Caption Facebook"
                  value={draft.facebookCaption}
                  suggestedCaption={suggestedCaption}
                  touched={draft.facebookCaptionTouched}
                  onChange={(next) =>
                    setDraft((current) => ({
                      ...current,
                      facebookCaption: next,
                      facebookCaptionTouched: true,
                    }))
                  }
                  onReset={() =>
                    setDraft((current) => ({
                      ...current,
                      facebookCaption: suggestedCaption,
                      facebookCaptionTouched: false,
                    }))
                  }
                  onCopy={() => {
                    const text = draft.facebookCaption.trim() || suggestedCaption;
                    void navigator.clipboard.writeText(text).then(
                      () => showSuccess("Caption copiat în clipboard."),
                      () => showError("Nu s-a putut copia caption-ul."),
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col xl:col-span-7 xl:min-h-0">
          <div className="app-panel flex flex-1 flex-col p-4 xl:min-h-0 xl:overflow-hidden">
            <div className="mb-3 shrink-0 border-b border-base-300/60 pb-3">
              <p className="app-section-title">Postare curentă</p>
              <p className="truncate text-sm font-medium text-base-content/80">{draftLabel}</p>
            </div>

            <AnnouncementPreviewPanel
              draft={draft}
              previewRef={previewRef}
              exportReady={exportReady}
              missingForExport={missingForExport}
              onTextBlockLayoutChange={onTextBlockLayoutChange}
            />

            <div className="mt-3 shrink-0 border-t border-base-300/60 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary btn-sm min-w-44"
                  onClick={() => void onExport()}
                  disabled={actionBusy || !exportReady}
                >
                  {busy ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Export...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Export imagine
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-info btn-sm min-w-52"
                  onClick={() => void onRequestPublish()}
                  disabled={actionBusy || !exportReady}
                >
                  {publishBusy ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Se publică...
                    </>
                  ) : (
                    <>
                      <Share2 size={16} />
                      Publică pe Facebook
                    </>
                  )}
                </button>
              </div>
              {!exportReady ? (
                <p className="helper-text mt-2 text-xs">
                  Pentru export, completează:{" "}
                  <span className="font-medium text-base-content/70">
                    {missingForExport.join(", ")}
                  </span>
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AnnouncementPreviewPanel({
  draft,
  previewRef,
  exportReady,
  missingForExport,
  onTextBlockLayoutChange,
}: {
  draft: AnnouncementDraft;
  previewRef: RefObject<AnnouncementCanvasHandle | null>;
  exportReady: boolean;
  missingForExport: string[];
  onTextBlockLayoutChange: (blockId: TemplateTextBlockId, geometry: TextBlockGeometry) => void;
}) {
  const { template } = draft;
  const containerRef = useRef<HTMLDivElement>(null);
  const { scale, pan, zoomPercent, isZoomed, resetZoom } = usePreviewZoom(
    containerRef,
    template.width,
    template.height,
  );

  return (
    <div className="flex min-h-[340px] min-w-0 flex-1 flex-col md:min-h-[380px] xl:min-h-0">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div>
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
              exportReady ? "badge-soft badge-success" : "badge-soft badge-warning"
            }`}
          >
            {exportReady ? "Gata export" : "Incomplet"}
          </span>
        </div>
      </div>

      {!exportReady ? (
        <p className="helper-text mb-3 text-xs">
          Lipsesc: <span className="font-medium">{missingForExport.join(", ")}</span>
        </p>
      ) : null}

      <div
        ref={containerRef}
        className="preview-stage preview-stage-scroll app-scroll relative min-h-[280px] w-full min-w-0 flex-1 overflow-hidden rounded-xl border border-base-300/60 p-2 md:min-h-[340px] md:p-3 xl:min-h-0"
        onDoubleClick={resetZoom}
        title="Scroll pentru zoom pe cursor · dublu-click pentru reset"
      >
        {scale !== null ? (
          <div
            className="absolute overflow-hidden rounded-lg shadow-sm ring-1 ring-base-300/50"
            style={{
              left: `${pan.x}px`,
              top: `${pan.y}px`,
              width: `${template.width * scale}px`,
              height: `${template.height * scale}px`,
            }}
          >
            <AnnouncementCanvas
              ref={previewRef}
              draft={draft}
              previewScale={scale}
              onTextBlockLayoutChange={onTextBlockLayoutChange}
            />
          </div>
        ) : null}
      </div>

      <p className="helper-text mt-2 shrink-0 text-center text-[11px]">
        Scroll pe preview pentru zoom. Apasă pe text pentru a muta sau redimensiona box-ul.
      </p>
    </div>
  );
}
