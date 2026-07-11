import { Alert, Spinner } from "flowbite-react";
import { ImagePlus, LayoutTemplate, LogOut, Share2, WandSparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logo from "../../assets/logo.png";
import { generateBulkCaption, generateCaption } from "../../services/captionGenerator";
import { publishBulkPost, publishPost } from "../../services/postsApi";
import { createPostDraft } from "../../shared/bulkPosts";
import { defaultTemplate } from "../../shared/defaults";
import { revokeBlobUrl } from "../../shared/productImage";
import type { LayerRect, PostDraft, ProductInput, TemplateLayout, UpdateStatus } from "../../shared/types";
import { MAX_BULK_POSTS } from "../../shared/types";
import { useAuth } from "../context/AuthContext";
import { savePngInBrowser } from "../services/browserExport";
import { buildPostRenderRequest, renderAllDraftImages, renderPostImageBlob } from "../services/postImage";
import { removeProductBackground } from "../services/removeProductBackground";
import { BulkSlideNavigator } from "./BulkSlideNavigator";
import { CanvasPreview } from "./CanvasPreview";
import type { PostCanvasHandle } from "./konva/PostCanvas";
import { ProductForm } from "./ProductForm";
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
  if (!product.productImagePath) errors.push("Poza produs obligatorie.");
  if (!template.backgroundImagePath) errors.push("Fundal obligatoriu.");
  if (!product.description.trim()) errors.push("Descriere obligatorie.");
  return errors;
};

const getUpdateBannerMessage = (status: UpdateStatus): string | null => {
  switch (status.phase) {
    case "checking":
      return "Se verifică actualizări...";
    case "available":
      return `Actualizare disponibilă (v${status.version}). Se descarcă...`;
    case "downloading":
      return `Se descarcă actualizarea... ${status.percent}%`;
    case "downloaded":
      return `Actualizare descărcată (v${status.version}). Repornește aplicația pentru instalare.`;
    case "not-available":
    case "error":
      return null;
  }
};

const isUpdateBannerLoading = (status: UpdateStatus): boolean =>
  status.phase === "checking" || status.phase === "downloading" || status.phase === "available";

export function MainApp() {
  const { user, logout, accessToken } = useAuth();
  const [drafts, setDrafts] = useState<PostDraft[]>(() => [createPostDraft(firstBundledTemplatePath)]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [bulkCaption, setBulkCaption] = useState("");
  const [bulkCaptionTouched, setBulkCaptionTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activePanel, setActivePanel] = useState<"product" | "template">("product");
  const [backgroundRemovalBusy, setBackgroundRemovalBusy] = useState(false);
  const [backgroundRemovalProgress, setBackgroundRemovalProgress] = useState(0);
  const [backgroundRemovalLabel, setBackgroundRemovalLabel] = useState("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const previewRef = useRef<PostCanvasHandle>(null);

  const activeDraft = drafts[activeIndex] ?? drafts[0]!;
  const product = activeDraft.product;
  const template = activeDraft.template;
  const isBulkMode = drafts.length > 1;

  const validationErrors = useMemo(() => validate(product, template), [product, template]);
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
          },
        };
      }),
    );
  }, []);

  useEffect(() => {
    if (!isBulkMode || bulkCaptionTouched) return;
    setBulkCaption(suggestedBulkCaption);
  }, [bulkCaptionTouched, isBulkMode, suggestedBulkCaption]);

  useEffect(() => {
    const unsubscribe = window.manacatApi?.onUpdateStatus?.((status) => {
      setUpdateStatus(status);
    });
    return () => unsubscribe?.();
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

  const updateBannerMessage = updateStatus ? getUpdateBannerMessage(updateStatus) : null;
  const updateBannerLoading = updateStatus ? isUpdateBannerLoading(updateStatus) : false;

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

  const onRemoveBackground = async () => {
    if (!product.productImagePath || product.productImageProcessedPath) return;

    setBackgroundRemovalBusy(true);
    setBackgroundRemovalProgress(0);
    setBackgroundRemovalLabel("Pregatire model...");
    setError("");

    try {
      const processedPath = await removeProductBackground(product.productImagePath, (progress) => {
        setBackgroundRemovalProgress(progress.percent);
        setBackgroundRemovalLabel(progress.label);
      });

      setProduct((previous) => {
        revokeBlobUrl(previous.productImageProcessedPath);
        return {
          ...previous,
          productImageProcessedPath: processedPath,
          productImageLayout: undefined,
        };
      });
      setMessage("Fundal eliminat. Poti ajusta pozitia pozei in preview.");
    } catch (removalError) {
      setError(
        removalError instanceof Error
          ? removalError.message
          : "Nu s-a putut elimina fundalul imaginii.",
      );
    } finally {
      setBackgroundRemovalBusy(false);
      setBackgroundRemovalLabel("");
    }
  };

  const onRevertBackground = () => {
    setProduct((previous) => {
      if (!previous.productImageProcessedPath) return previous;
      revokeBlobUrl(previous.productImageProcessedPath);
      return {
        ...previous,
        productImageProcessedPath: undefined,
        productImageLayout: undefined,
      };
    });
    setMessage("");
  };

  const onProductImageLayoutChange = (layout: LayerRect) => {
    setProduct((previous) => ({ ...previous, productImageLayout: layout }));
  };

  const onAddDraft = () => {
    if (drafts.length >= MAX_BULK_POSTS) {
      setError(`Poti adauga maxim ${MAX_BULK_POSTS} postari intr-un lot.`);
      return;
    }

    const backgroundImagePath = template.backgroundImagePath || firstBundledTemplatePath;
    setDrafts((current) => [...current, createPostDraft(backgroundImagePath)]);
    setActiveIndex(drafts.length);
    setError("");
    setMessage("Postare noua adaugata in lot.");
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
    setMessage("Postarea a fost scoasa din lot.");
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
      setError(validationErrors.join(" "));
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (window.manacatApi?.exportPost) {
        const request = await buildPostRenderRequest(previewRef.current, product, template);
        if (!request) {
          setError("Nu s-a putut genera overlay-ul text pentru export.");
          return;
        }

        const result = await window.manacatApi.exportPost(request);
        if (!result.success) {
          setError(result.error ?? "Export esuat.");
          return;
        }
        setMessage(`Imagine salvata: ${result.imagePath}`);
        return;
      }

      const fullImageDataUrl = await previewRef.current?.exportFullImage();
      if (!fullImageDataUrl) {
        setError("Nu s-a putut genera imaginea pentru export.");
        return;
      }

      const result = await savePngInBrowser(fullImageDataUrl, product.productName);
      if (!result.success) {
        setError(result.error ?? "Export esuat.");
        return;
      }
      setMessage(`Imagine salvata: ${result.fileName}`);
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : "Export esuat (eroare necunoscuta).",
      );
    } finally {
      setBusy(false);
    }
  };

  const onPublishToFacebook = async () => {
    const errorsToCheck = isBulkMode ? allDraftErrors : validationErrors;
    if (errorsToCheck.length) {
      setError(errorsToCheck.join(" "));
      return;
    }
    if (!accessToken) {
      setError("Sesiunea a expirat. Autentifică-te din nou.");
      return;
    }

    setPublishBusy(true);
    setError("");
    setMessage("");

    try {
      if (isBulkMode) {
        const images = await renderAllDraftImages(drafts, previewRef.current, setActiveIndex);
        const caption = bulkCaption.trim() || suggestedBulkCaption;
        if (!caption.trim()) {
          setError("Caption-ul pentru lot este obligatoriu.");
          return;
        }

        const result = await publishBulkPost(accessToken, images, caption);
        setMessage(
          `Lot publicat pe Facebook cu ${images.length} imagini (ID: ${result.facebookPostId}).`,
        );
        return;
      }

      const image = await renderPostImageBlob(previewRef.current, product, template);
      if (!image) {
        setError("Nu s-a putut genera imaginea pentru publicare.");
        return;
      }

      const caption = generateCaption(product);
      const result = await publishPost(accessToken, image, caption);
      setMessage(`Postare publicată pe Facebook (ID: ${result.facebookPostId}).`);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Publicarea pe Facebook a eșuat.",
      );
    } finally {
      setPublishBusy(false);
    }
  };

  const actionBusy = busy || publishBusy;

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#ffedd5,_#fff7ed_40%,_#fffaf5_75%)] text-slate-900">
      <div className="flex h-full flex-col">
        <header className="h-20 border-b border-white/10 bg-gradient-to-r from-black via-zinc-900 to-neutral-800 shadow-lg shadow-black/30">
          <div className="flex h-full items-center justify-between gap-3 pl-0 pr-5">
            <div className="flex h-full items-center gap-3">
              <img src={logo} alt="Logo Manacat" className="h-full w-auto rounded-lg object-contain" />
              <h1 className="text-2xl font-bold text-white">PostPilot</h1>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <span className="hidden text-sm text-white/80 sm:inline">{user.name}</span>
              ) : null}
              <button
                type="button"
                onClick={() => void onLogout()}
                disabled={logoutBusy}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {logoutBusy ? <Spinner size="sm" /> : <LogOut size={16} />}
                Deconectare
              </button>
            </div>
          </div>
        </header>

        {updateBannerMessage ? (
          <div className="flex items-center justify-center gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-800">
            {updateBannerLoading ? <Spinner size="sm" color="warning" /> : null}
            <span>{updateBannerMessage}</span>
          </div>
        ) : null}

        <div className="mx-auto grid min-h-0 w-full max-w-[1680px] flex-1 gap-4 p-4 xl:grid-cols-12 xl:p-5">
          <section className="flex min-h-0 flex-col xl:col-span-4">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/75 shadow-xl shadow-orange-200/50 backdrop-blur">
              <div className="shrink-0 p-4 pb-0">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-orange-700">
                  <WandSparkles size={16} />
                  {isBulkMode ? "Lot postări" : "Postează un produs"}
                </div>
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-orange-100 bg-orange-50/70 p-1">
                  <button
                    type="button"
                    onClick={() => setActivePanel("product")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                      activePanel === "product"
                        ? "bg-white text-orange-700 shadow-sm"
                        : "text-slate-600 hover:bg-white/60"
                    }`}
                  >
                    <ImagePlus size={14} />
                    Date produs
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel("template")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
                      activePanel === "template"
                        ? "bg-white text-orange-700 shadow-sm"
                        : "text-slate-600 hover:bg-white/60"
                    }`}
                  >
                    <LayoutTemplate size={14} />
                    Șabloane
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-0">
                <div className={activePanel === "product" ? "block" : "hidden"}>
                  <ProductForm
                    product={product}
                    onChange={setProduct}
                    onPickProductImage={onPickProductImage}
                    onRemoveBackground={onRemoveBackground}
                    onRevertBackground={onRevertBackground}
                    backgroundRemovalBusy={backgroundRemovalBusy}
                    backgroundRemovalProgress={backgroundRemovalProgress}
                    backgroundRemovalLabel={backgroundRemovalLabel}
                  />
                </div>
                <div className={activePanel === "template" ? "block" : "hidden"}>
                  <TemplateControls template={template} onChange={setTemplate} />
                </div>

                {isBulkMode ? (
                  <div className="mt-4 space-y-2">
                    <label
                      htmlFor="bulk-caption"
                      className="block text-xs font-semibold uppercase tracking-wide text-orange-700"
                    >
                      Caption lot Facebook
                    </label>
                    <textarea
                      id="bulk-caption"
                      rows={6}
                      value={bulkCaption}
                      onChange={(event) => {
                        setBulkCaptionTouched(true);
                        setBulkCaption(event.target.value);
                      }}
                      className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-orange-200 focus:border-orange-300 focus:ring-2"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col xl:col-span-8">
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-3 shadow-xl shadow-orange-200/50 backdrop-blur">
                <BulkSlideNavigator
                  drafts={drafts}
                  activeIndex={activeIndex}
                  onSelect={setActiveIndex}
                  onAdd={onAddDraft}
                  onRemove={onRemoveDraft}
                />

                <div className="min-h-0 flex-1">
                  <CanvasPreview
                    ref={previewRef}
                    product={product}
                    template={template}
                    onProductImageLayoutChange={onProductImageLayoutChange}
                  />
                </div>
              </div>

              <div className="shrink-0 rounded-2xl border border-orange-100 bg-white/75 p-4 shadow-lg shadow-orange-100/80 backdrop-blur">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex min-w-44 items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-300/60 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => void onExport()}
                    disabled={actionBusy}
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size="sm" />
                        Export in progres...
                      </span>
                    ) : (
                      "Export imagine"
                    )}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-w-52 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-300/50 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => void onPublishToFacebook()}
                    disabled={actionBusy}
                  >
                    {publishBusy ? (
                      <>
                        <Spinner size="sm" />
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
              </div>

              {error && <Alert color="failure">{error}</Alert>}
              {message && <Alert color="success">{message}</Alert>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
