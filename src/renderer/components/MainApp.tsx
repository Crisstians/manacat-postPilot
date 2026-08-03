import { Download, ImagePlus, LayoutTemplate, Share2, WandSparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateBulkCaption, generateCaption } from "../../services/captionGenerator";
import { publishBulkPost, publishPost } from "../../services/postsApi";
import { createPostDraft, duplicatePostDraft } from "../../shared/bulkPosts";
import { createEmptyWorkSession } from "../../shared/draftStorage";
import { defaultTemplate } from "../../shared/defaults";
import {
  countProductRequiredMissing,
  FIELD_NAVIGATION,
  getMissingExportLabels,
  getProductPanelIncomplete,
  getTemplatePanelIncomplete,
  isExportReady,
} from "../../shared/exportReadiness";
import { openFacebookPostInBrowser } from "../../shared/facebookPostUrl";
import { revokeBlobUrl } from "../../shared/productImage";
import type {
  LayerRect,
  PostDraft,
  ProductInput,
  TemplateLayout,
  TemplateTextBlockId,
  TextBlockGeometry,
} from "../../shared/types";
import { MAX_BULK_POSTS } from "../../shared/types";
import { applyTextBlockGeometry, normalizeTemplateTextBlocks } from "../../shared/textBlockLayout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { savePngInBrowser } from "../services/browserExport";
import {
  isDraftStorageQuotaError,
  loadWorkSession,
  saveWorkSession,
} from "../services/draftPersistence";
import { buildPostRenderRequest, renderAllDraftImages, renderPostImageBlob } from "../services/postImage";
import { ActionLoadingOverlay, type ActionLoadingState } from "./ActionLoadingOverlay";
import { AppHeader } from "./AppHeader";
import { BulkSlideNavigator } from "./BulkSlideNavigator";
import { CanvasPreview } from "./CanvasPreview";
import { CaptionEditor } from "./CaptionEditor";
import type { PostCanvasHandle } from "./konva/PostCanvas";
import { ProductForm } from "./ProductForm";
import {
  BULK_PUBLISH_CHECKLIST,
  PRODUCT_PUBLISH_CHECKLIST,
  PublishConfirmModal,
} from "./PublishConfirmModal";
import { TemplateControls } from "./TemplateControls";

const bundledTemplateModules = import.meta.glob(
  "../../assets/templatesPostari/*.{png,jpg,jpeg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const firstBundledTemplatePath =
  Object.entries(bundledTemplateModules).sort(([left], [right]) => left.localeCompare(right, "ro"))[0]?.[1] ?? "";

const validate = (product: ProductInput, template: TemplateLayout): string[] => {
  const errors: string[] = [];
  if (!product.productName.trim()) errors.push("Nume produs obligatoriu.");
  if (product.price <= 0) errors.push("Pretul trebuie sa fie pozitiv.");
  if (product.hasDiscount) {
    if (product.originalPrice <= 0) errors.push("Pretul inainte de reducere este obligatoriu.");
    else if (product.originalPrice <= product.price) {
      errors.push("Pretul inainte de reducere trebuie sa fie mai mare decat pretul redus.");
    }
  }
  if (!product.productImagePath) errors.push("Poza produs obligatorie.");
  if (!template.backgroundImagePath) errors.push("Fundal obligatoriu.");
  if (!product.description.trim()) errors.push("Descriere obligatorie.");
  return errors;
};

interface MainAppProps {
  onBack: () => void;
}

export function MainApp({ onBack }: MainAppProps) {
  const { user, logout, accessToken } = useAuth();
  const { showSuccess, showError } = useToast();
  const [{ session: initialSession, restored: sessionRestored }] = useState(() =>
    user?.id
      ? loadWorkSession(user.id, firstBundledTemplatePath)
      : { session: createEmptyWorkSession(firstBundledTemplatePath), restored: false },
  );
  const [drafts, setDrafts] = useState<PostDraft[]>(initialSession.drafts);
  const [activeIndex, setActiveIndex] = useState(initialSession.activeIndex);
  const [bulkCaption, setBulkCaption] = useState(initialSession.bulkCaption);
  const [bulkCaptionTouched, setBulkCaptionTouched] = useState(initialSession.bulkCaptionTouched);
  const [busy, setBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishPreviewUrls, setPublishPreviewUrls] = useState<string[]>([]);
  const [publishPreviewLoading, setPublishPreviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<ActionLoadingState | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const publishPreviewBlobsRef = useRef<Blob[] | null>(null);
  const [activePanel, setActivePanel] = useState<"product" | "template">(initialSession.activePanel);
  const [showFieldHints, setShowFieldHints] = useState(false);
  const previewRef = useRef<PostCanvasHandle>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const skipAutoSaveRef = useRef(true);
  const restoreToastShownRef = useRef(false);
  const quotaErrorShownRef = useRef(false);

  const activeDraft = drafts[activeIndex] ?? drafts[0]!;
  const product = activeDraft.product;
  const template = activeDraft.template;
  const isBulkMode = drafts.length > 1;

  const validationErrors = useMemo(() => validate(product, template), [product, template]);
  const exportReady = useMemo(() => isExportReady(product, template), [product, template]);
  const missingForExport = useMemo(
    () => getMissingExportLabels(product, template),
    [product, template],
  );
  const productPanelIncomplete = useMemo(() => getProductPanelIncomplete(product), [product]);
  const templatePanelIncomplete = useMemo(() => getTemplatePanelIncomplete(template), [template]);
  const productMissingCount = useMemo(() => countProductRequiredMissing(product), [product]);
  const allDraftErrors = useMemo(
    () =>
      drafts.flatMap((draft, index) =>
        validate(draft.product, draft.template).map((issue) => `Postarea ${index + 1}: ${issue}`),
      ),
    [drafts],
  );

  const suggestedBulkCaption = useMemo(
    () => generateBulkCaption(drafts.map((draft) => draft.product)),
    [drafts],
  );

  const suggestedCaption = useMemo(() => generateCaption(product), [product]);

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
      void saveWorkSession(
        user.id,
        {
          drafts,
          activeIndex,
          activePanel,
          bulkCaption,
          bulkCaptionTouched,
        },
        firstBundledTemplatePath,
      ).catch((error) => {
        if (isDraftStorageQuotaError(error) && !quotaErrorShownRef.current) {
          quotaErrorShownRef.current = true;
          showError("Draft-ul nu a putut fi salvat: spațiul local este plin.");
        }
      });
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [user?.id, drafts, activeIndex, activePanel, bulkCaption, bulkCaptionTouched, showError]);

  useEffect(() => {
    setDrafts((current) =>
      current.map((draft, index) => {
        if (index !== activeIndex || draft.facebookCaptionTouched) return draft;
        const nextCaption = generateCaption(draft.product);
        if (draft.facebookCaption === nextCaption) return draft;
        return { ...draft, facebookCaption: nextCaption };
      }),
    );
  }, [activeIndex, suggestedCaption, product]);

  useEffect(() => {
    const backgroundImagePath = firstBundledTemplatePath;
    setDrafts((current) =>
      current.map((draft) => {
        const nextBackground = draft.template.backgroundImagePath || backgroundImagePath;
        if (draft.template.id !== defaultTemplate.id) {
          return nextBackground === draft.template.backgroundImagePath
            ? draft
            : { ...draft, template: { ...draft.template, backgroundImagePath: nextBackground } };
        }

        return {
          ...draft,
          template: {
            ...defaultTemplate,
            backgroundImagePath: nextBackground,
            productLayer: draft.template.productLayer,
            textBlocks: normalizeTemplateTextBlocks({
              ...defaultTemplate.textBlocks,
              ...draft.template.textBlocks,
            }),
          },
        };
      }),
    );
  }, []);

  useEffect(() => {
    if (!isBulkMode || bulkCaptionTouched) return;
    setBulkCaption(suggestedBulkCaption);
  }, [bulkCaptionTouched, isBulkMode, suggestedBulkCaption]);

  const focusField = useCallback((fieldKey: string) => {
    const target = FIELD_NAVIGATION[fieldKey];
    if (!target) return;

    setActivePanel(target.panel);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const element = document.getElementById(target.elementId);
        const scrollContainer = sidebarScrollRef.current;
        if (element && scrollContainer) {
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const elementTop = element.getBoundingClientRect().top;
          scrollContainer.scrollTo({
            top: scrollContainer.scrollTop + (elementTop - containerTop) - 24,
            behavior: "smooth",
          });
        } else {
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        if (element instanceof HTMLElement) {
          element.classList.add("field-highlight");
          window.setTimeout(() => element.classList.remove("field-highlight"), 1200);
        }

        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLButtonElement
        ) {
          element.focus({ preventScroll: true });
        } else {
          element?.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
        }
      }, 50);
    });
  }, []);

  const setProduct = useCallback(
    (updater: ProductInput | ((previous: ProductInput) => ProductInput)) => {
      setDrafts((current) =>
        current.map((draft, index) => {
          if (index !== activeIndex) return draft;
          const nextProduct =
            typeof updater === "function" ? updater(draft.product) : updater;
          return { ...draft, product: nextProduct };
        }),
      );
    },
    [activeIndex],
  );

  const setTemplate = useCallback(
    (updater: TemplateLayout | ((previous: TemplateLayout) => TemplateLayout)) => {
      setDrafts((current) =>
        current.map((draft, index) => {
          if (index !== activeIndex) return draft;
          const nextTemplate =
            typeof updater === "function" ? updater(draft.template) : updater;
          return { ...draft, template: nextTemplate };
        }),
      );
    },
    [activeIndex],
  );

  const resetProductImageState = (previous: ProductInput, productImagePath: string): ProductInput => {
    revokeBlobUrl(previous.productImagePath);
    revokeBlobUrl(previous.productImageProcessedPath);
    return {
      ...previous,
      productImagePath,
      productImageProcessedPath: undefined,
      productImageLayout: undefined,
    };
  };

  const onPickProductImage = async () => {
    if (window.manacatApi?.pickProductImage) {
      const path = await window.manacatApi.pickProductImage();
      if (path) {
        setProduct((previous) => resetProductImageState(previous, path));
      }
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setProduct((previous) => resetProductImageState(previous, url));
    };
    input.click();
  };

  const onProductImageFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setProduct((previous) => resetProductImageState(previous, url));
  };

  const onRemoveProductImage = () => {
    setProduct((previous) => resetProductImageState(previous, ""));
  };

  const onProductImageLayoutChange = (layout: LayerRect) => {
    setProduct((previous) => ({ ...previous, productImageLayout: layout }));
  };

  const onTextBlockLayoutChange = (blockId: TemplateTextBlockId, geometry: TextBlockGeometry) => {
    setTemplate((previous) => ({
      ...previous,
      textBlocks: {
        ...previous.textBlocks,
        [blockId]: applyTextBlockGeometry(previous.textBlocks[blockId], geometry),
      },
    }));
  };

  const onDuplicateDraft = () => {
    if (drafts.length >= MAX_BULK_POSTS) {
      showError(`Poți adăuga maxim ${MAX_BULK_POSTS} postări într-un lot.`);
      return;
    }

    const source = drafts[activeIndex];
    if (!source) return;

    const copy = duplicatePostDraft(source);
    setDrafts((current) => {
      const next = [...current];
      next.splice(activeIndex + 1, 0, copy);
      return next;
    });
    setActiveIndex(activeIndex + 1);
    showSuccess("Postare duplicată.");
  };

  const onAddDraft = () => {
    if (drafts.length >= MAX_BULK_POSTS) {
      showError(`Poți adăuga maxim ${MAX_BULK_POSTS} postări într-un lot.`);
      return;
    }

    const backgroundImagePath = template.backgroundImagePath || firstBundledTemplatePath;
    setDrafts((current) => [...current, createPostDraft(backgroundImagePath)]);
    setActiveIndex(drafts.length);
    showSuccess("Postare nouă adăugată în lot.");
  };

  const onRemoveDraft = (index: number) => {
    if (drafts.length <= 1) return;

    const draft = drafts[index];
    if (draft) {
      revokeBlobUrl(draft.product.productImagePath);
      revokeBlobUrl(draft.product.productImageProcessedPath);
    }

    const nextDrafts = drafts.filter((_, draftIndex) => draftIndex !== index);
    setDrafts(nextDrafts);
    setActiveIndex((current) => Math.min(current, nextDrafts.length - 1));
    showSuccess("Postarea a fost scoasă din lot.");
  };

  const copyCaptionToClipboard = async (text: string) => {
    const caption = text.trim();
    if (!caption) {
      showError("Caption-ul este gol.");
      return;
    }

    try {
      await navigator.clipboard.writeText(caption);
      showSuccess("Caption copiat în clipboard.");
    } catch {
      showError("Nu s-a putut copia caption-ul.");
    }
  };

  const setActiveDraftCaption = (caption: string, touched = true) => {
    setDrafts((current) =>
      current.map((draft, index) =>
        index === activeIndex
          ? { ...draft, facebookCaption: caption, facebookCaptionTouched: touched }
          : draft,
      ),
    );
  };

  const resetActiveDraftCaption = () => {
    setDrafts((current) =>
      current.map((draft, index) =>
        index === activeIndex
          ? {
              ...draft,
              facebookCaption: generateCaption(draft.product),
              facebookCaptionTouched: false,
            }
          : draft,
      ),
    );
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
    if (validationErrors.length) {
      setShowFieldHints(true);
      showError(validationErrors.join(" "));
      return;
    }
    setBusy(true);
    setActionLoading({
      variant: "export",
      stepIndex: 0,
      progress: 12,
      detail: product.productName.trim() || "Postare curentă",
    });
    try {
      if (window.manacatApi?.exportPost) {
        setActionLoading({
          variant: "export",
          stepIndex: 1,
          progress: 45,
          detail: "Compunem straturile text și imagine...",
        });
        const request = await buildPostRenderRequest(previewRef.current, product, template);
        if (!request) {
          showError("Nu s-a putut genera overlay-ul text pentru export.");
          return;
        }

        setActionLoading({
          variant: "export",
          stepIndex: 2,
          progress: 78,
          detail: "Se salvează pe disc...",
        });
        const result = await window.manacatApi.exportPost(request);
        if (!result.success) {
          showError(result.error ?? "Export eșuat.");
          return;
        }
        setActionLoading({
          variant: "export",
          stepIndex: 2,
          progress: 100,
          detail: "Export finalizat",
        });
        showSuccess(`Imagine salvată: ${result.imagePath}`);
        return;
      }

      setActionLoading({
        variant: "export",
        stepIndex: 1,
        progress: 45,
        detail: "Generăm previzualizarea la rezoluție completă...",
      });
      const fullImageDataUrl = await previewRef.current?.exportFullImage();
      if (!fullImageDataUrl) {
        showError("Nu s-a putut genera imaginea pentru export.");
        return;
      }

      setActionLoading({
        variant: "export",
        stepIndex: 2,
        progress: 82,
        detail: "Se descarcă fișierul PNG...",
      });
      const result = await savePngInBrowser(fullImageDataUrl, product.productName);
      if (!result.success) {
        showError(result.error ?? "Export eșuat.");
        return;
      }
      setActionLoading({
        variant: "export",
        stepIndex: 2,
        progress: 100,
        detail: "Export finalizat",
      });
      showSuccess(`Imagine salvată: ${result.fileName}`);
    } catch (exportError) {
      showError(
        exportError instanceof Error ? exportError.message : "Export eșuat (eroare necunoscută).",
      );
    } finally {
      setActionLoading(null);
      setBusy(false);
    }
  };

  const clearPublishPreview = useCallback(() => {
    for (const url of publishPreviewUrls) {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    }
    setPublishPreviewUrls([]);
    publishPreviewBlobsRef.current = null;
  }, [publishPreviewUrls]);

  const closePublishConfirm = useCallback(() => {
    if (publishBusy) return;
    setPublishConfirmOpen(false);
    clearPublishPreview();
  }, [publishBusy, clearPublishPreview]);

  const onRequestPublishToFacebook = async () => {
    const errorsToCheck = isBulkMode ? allDraftErrors : validationErrors;
    if (errorsToCheck.length) {
      setShowFieldHints(true);
      showError(errorsToCheck.join(" "));
      return;
    }
    if (!accessToken) {
      showError("Sesiunea a expirat. Autentifică-te din nou.");
      return;
    }

    clearPublishPreview();
    setPublishConfirmOpen(true);
    setPublishPreviewLoading(true);

    try {
      if (isBulkMode) {
        const images = await renderAllDraftImages(drafts, previewRef.current, setActiveIndex);
        publishPreviewBlobsRef.current = images;
        setPublishPreviewUrls(images.map((image) => URL.createObjectURL(image)));
        return;
      }

      const dataUrl = await previewRef.current?.exportFullImage();
      if (dataUrl) {
        setPublishPreviewUrls([dataUrl]);
        return;
      }

      const image = await renderPostImageBlob(previewRef.current, product, template);
      if (image) {
        publishPreviewBlobsRef.current = [image];
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

  const onPublishToFacebook = async () => {
    const errorsToCheck = isBulkMode ? allDraftErrors : validationErrors;
    if (errorsToCheck.length) {
      setShowFieldHints(true);
      showError(errorsToCheck.join(" "));
      return;
    }
    if (!accessToken) {
      showError("Sesiunea a expirat. Autentifică-te din nou.");
      return;
    }

    setPublishBusy(true);
    setActionLoading({
      variant: "publish",
      stepIndex: 0,
      progress: 8,
      detail: isBulkMode ? `0 / ${drafts.length} postări` : product.productName.trim() || "Postare curentă",
    });

    try {
      if (isBulkMode) {
        const cached = publishPreviewBlobsRef.current;
        const images =
          cached && cached.length === drafts.length
            ? cached
            : await renderAllDraftImages(
                drafts,
                previewRef.current,
                setActiveIndex,
                (current, total) => {
                  setActionLoading({
                    variant: "publish",
                    stepIndex: 0,
                    progress: 10 + (current / total) * 52,
                    detail: `Postare ${current} din ${total}`,
                  });
                },
              );
        const caption = bulkCaption.trim() || suggestedBulkCaption;
        if (!caption.trim()) {
          showError("Caption-ul pentru lot este obligatoriu.");
          return;
        }

        setActionLoading({
          variant: "publish",
          stepIndex: 1,
          progress: 68,
          detail: `${images.length} imagini pregătite`,
        });
        setActionLoading({
          variant: "publish",
          stepIndex: 2,
          progress: 86,
          detail: "Se încarcă lotul pe Facebook...",
        });
        const result = await publishBulkPost(accessToken, images, caption);
        setActionLoading({
          variant: "publish",
          stepIndex: 2,
          progress: 100,
          detail: "Lot publicat cu succes",
        });
        showSuccess(
          `Lot publicat pe Facebook cu ${images.length} imagini (ID: ${result.facebookPostId}).`,
        );
        setPublishConfirmOpen(false);
        clearPublishPreview();
        await openFacebookPostInBrowser(result.facebookPostId);
        return;
      }

      setActionLoading({
        variant: "publish",
        stepIndex: 0,
        progress: 35,
        detail: "Compunem imaginea finală...",
      });
      const image = await renderPostImageBlob(previewRef.current, product, template);
      if (!image) {
        showError("Nu s-a putut genera imaginea pentru publicare.");
        return;
      }

      setActionLoading({
        variant: "publish",
        stepIndex: 1,
        progress: 62,
        detail: "Caption pregătit pentru Facebook",
      });
      const caption = activeDraft.facebookCaption.trim() || suggestedCaption;
      setActionLoading({
        variant: "publish",
        stepIndex: 2,
        progress: 84,
        detail: "Se încarcă pe Facebook...",
      });
      const result = await publishPost(accessToken, image, caption);
      setActionLoading({
        variant: "publish",
        stepIndex: 2,
        progress: 100,
        detail: "Postare publicată cu succes",
      });
      showSuccess(`Postare publicată pe Facebook (ID: ${result.facebookPostId}).`);
      setPublishConfirmOpen(false);
      clearPublishPreview();
      await openFacebookPostInBrowser(result.facebookPostId);
    } catch (publishError) {
      showError(
        publishError instanceof Error
          ? publishError.message
          : "Publicarea pe Facebook a eșuat.",
      );
    } finally {
      setActionLoading(null);
      setPublishBusy(false);
    }
  };

  const actionBusy = busy || publishBusy;
  const canActOnCurrentPost = exportReady;
  const canPublishBulk = isBulkMode ? allDraftErrors.length === 0 : exportReady;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (!actionBusy && canActOnCurrentPost) {
          void onExport();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actionBusy, canActOnCurrentPost, onExport]);

  return (
    <main className="editor-shell flex flex-col bg-base-200 text-base-content">
      <ActionLoadingOverlay state={actionLoading} />
      <PublishConfirmModal
        open={publishConfirmOpen}
        title={
          isBulkMode
            ? `Confirmă publicarea lotului (${drafts.length} postări)`
            : "Confirmă publicarea pe Facebook"
        }
        caption={
          isBulkMode
            ? bulkCaption.trim() || suggestedBulkCaption
            : activeDraft.facebookCaption.trim() || suggestedCaption
        }
        checklist={isBulkMode ? BULK_PUBLISH_CHECKLIST : PRODUCT_PUBLISH_CHECKLIST}
        previewUrls={publishPreviewUrls}
        previewLoading={publishPreviewLoading}
        confirmBusy={publishBusy}
        onCancel={closePublishConfirm}
        onConfirm={() => void onPublishToFacebook()}
      />
      <div className="editor-shell-body flex min-h-full flex-col">
        <AppHeader
          onBack={onBack}
          subtitle="Promovare produs"
          onLogout={onLogout}
          logoutBusy={logoutBusy}
        />

        <div className="editor-shell-stack mx-auto grid w-full max-w-[1680px] flex-1 gap-4 p-4 xl:min-h-0 xl:grid-cols-12 xl:p-5">
          <section className="flex min-w-0 flex-col xl:col-span-5 xl:min-h-0">
            <div className="app-panel flex flex-1 flex-col xl:min-h-0 xl:overflow-hidden">
              <div className="shrink-0 border-b border-base-300/60 p-4 pb-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-base-content">
                  <WandSparkles size={16} className="text-primary" />
                  {isBulkMode ? "Lot postări" : "Postează un produs"}
                </div>
                <div className="surface-muted grid grid-cols-2 gap-1.5 rounded-xl border border-base-300/60 p-1">
                  <button
                    type="button"
                    onClick={() => setActivePanel("product")}
                    className={`panel-tab ${activePanel === "product" ? "panel-tab-active" : "panel-tab-idle"}`}
                  >
                    <ImagePlus size={14} />
                    Date produs
                    {productPanelIncomplete ? (
                      <span className="badge badge-xs badge-soft badge-warning min-h-0 px-1.5 py-0">
                        {productMissingCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel("template")}
                    className={`panel-tab ${activePanel === "template" ? "panel-tab-active" : "panel-tab-idle"}`}
                  >
                    <LayoutTemplate size={14} />
                    Șabloane
                    {templatePanelIncomplete ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label="Fundal lipsă" />
                    ) : null}
                  </button>
                </div>
              </div>

              <div ref={sidebarScrollRef} className="app-scroll min-h-0 flex-1 overflow-y-auto p-4">
                <div className={activePanel === "product" ? "block" : "hidden"}>
                  <ProductForm
                    product={product}
                    template={template}
                    onChange={setProduct}
                    onNavigateField={focusField}
                    onPickProductImage={onPickProductImage}
                    onProductImageFile={onProductImageFile}
                    onRemoveProductImage={onRemoveProductImage}
                    showFieldHints={showFieldHints}
                  />
                </div>
                <div className={activePanel === "template" ? "block" : "hidden"}>
                  <TemplateControls template={template} onChange={setTemplate} />
                </div>

                {isBulkMode ? (
                  <div className="mt-4">
                    <CaptionEditor
                      id="bulk-caption"
                      label="Caption lot Facebook"
                      value={bulkCaption}
                      suggestedCaption={suggestedBulkCaption}
                      touched={bulkCaptionTouched}
                      onChange={(next) => {
                        setBulkCaptionTouched(true);
                        setBulkCaption(next);
                      }}
                      onReset={() => {
                        setBulkCaptionTouched(false);
                        setBulkCaption(suggestedBulkCaption);
                      }}
                      onCopy={() => void copyCaptionToClipboard(bulkCaption.trim() || suggestedBulkCaption)}
                      rows={6}
                      placeholder="Textul care va însoți toate postările din lot..."
                    />
                  </div>
                ) : (
                  <div className="mt-4">
                    <CaptionEditor
                      id="facebook-caption"
                      label="Caption Facebook"
                      value={activeDraft.facebookCaption}
                      suggestedCaption={suggestedCaption}
                      touched={activeDraft.facebookCaptionTouched}
                      onChange={(next) => setActiveDraftCaption(next, true)}
                      onReset={resetActiveDraftCaption}
                      onCopy={() =>
                        void copyCaptionToClipboard(
                          activeDraft.facebookCaption.trim() || suggestedCaption,
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="flex min-w-0 flex-col xl:col-span-7 xl:min-h-0">
            <div className="flex flex-1 flex-col gap-3 xl:min-h-0">
              <div className="app-panel flex flex-1 flex-col p-4 xl:min-h-0 xl:overflow-hidden">
                <BulkSlideNavigator
                  drafts={drafts}
                  activeIndex={activeIndex}
                  onSelect={setActiveIndex}
                  onAdd={onAddDraft}
                  onDuplicate={onDuplicateDraft}
                  onRemove={onRemoveDraft}
                />

                <div className="min-h-[340px] min-w-0 flex-1 md:min-h-[380px] xl:min-h-0">
                  <CanvasPreview
                    ref={previewRef}
                    product={product}
                    template={template}
                    onProductImageLayoutChange={onProductImageLayoutChange}
                    onTextBlockLayoutChange={onTextBlockLayoutChange}
                    onNavigateField={focusField}
                  />
                </div>

                <div className="mt-3 shrink-0 border-t border-base-300/60 pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm min-w-44"
                      onClick={() => void onExport()}
                      disabled={actionBusy || !canActOnCurrentPost}
                      title={
                        !canActOnCurrentPost
                          ? `Completează: ${missingForExport.join(", ")}`
                          : undefined
                      }
                    >
                      {busy ? (
                        <>
                          <span className="loading loading-spinner loading-xs" />
                          Export in progres...
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
                      onClick={() => void onRequestPublishToFacebook()}
                      disabled={actionBusy || !canPublishBulk}
                      title={
                        !canPublishBulk && !isBulkMode
                          ? `Completează: ${missingForExport.join(", ")}`
                          : undefined
                      }
                    >
                      {publishBusy ? (
                        <>
                          <span className="loading loading-spinner loading-xs" />
                          Se publică...
                        </>
                      ) : (
                        <>
                          <Share2 size={16} />
                          {isBulkMode
                            ? `Publică toate (${drafts.length}) pe Facebook`
                            : "Publică pe Facebook"}
                        </>
                      )}
                    </button>
                  </div>
                  {!canActOnCurrentPost ? (
                    <p className="helper-text mt-2 text-xs">
                      Pentru export, completează:{" "}
                      <span className="font-medium text-base-content/70">
                        {missingForExport.join(", ")}
                      </span>
                      {" · "}
                      <span className="text-base-content/45">Ctrl+E când e gata</span>
                    </p>
                  ) : (
                    <p className="helper-text mt-2 text-xs text-base-content/45">
                      Scurtătură: <kbd className="kbd-shortcut">Ctrl</kbd> +{" "}
                      <kbd className="kbd-shortcut">E</kbd>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
