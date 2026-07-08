import { Alert, Spinner } from "flowbite-react";
import { ImagePlus, LayoutTemplate, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import logo from "../assets/logo.png";
import { defaultProduct, defaultTemplate } from "../shared/defaults";
import {
  getDisplayProductImagePath,
  imageSourceToBase64,
  needsBase64Export,
  revokeBlobUrl,
} from "../shared/productImage";
import { resolveProductImageSource } from "./productImageSource";
import type { LayerRect, ProductInput, TemplateLayout } from "../shared/types";
import { removeProductBackground } from "./services/removeProductBackground";
import { savePngInBrowser } from "./services/browserExport";
import { CanvasPreview } from "./components/CanvasPreview";
import type { PostCanvasHandle } from "./components/konva/PostCanvas";
import { ProductForm } from "./components/ProductForm";
import { TemplateControls } from "./components/TemplateControls";

const bundledTemplateModules = import.meta.glob(
  "../assets/templatesPostari/*.{png,jpg,jpeg,webp}",
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

export default function App() {
  const [product, setProduct] = useState<ProductInput>(defaultProduct);
  const [template, setTemplate] = useState<TemplateLayout>(defaultTemplate);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [activePanel, setActivePanel] = useState<"product" | "template">("product");
  const [backgroundRemovalBusy, setBackgroundRemovalBusy] = useState(false);
  const [backgroundRemovalProgress, setBackgroundRemovalProgress] = useState(0);
  const [backgroundRemovalLabel, setBackgroundRemovalLabel] = useState("");
  const previewRef = useRef<PostCanvasHandle>(null);

  const validationErrors = useMemo(() => validate(product, template), [product, template]);

  useEffect(() => {
    if (template.backgroundImagePath || !firstBundledTemplatePath) return;
    setTemplate((previous) => ({
      ...previous,
      backgroundImagePath: firstBundledTemplatePath,
    }));
  }, [template.backgroundImagePath]);

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
    // În aplicația Electron folosim dialogul nativ; în dev (browser) facem fallback la un input de fișier.
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
        const overlayDataUrl = await previewRef.current?.exportTextOverlay();
        if (!overlayDataUrl) {
          setError("Nu s-a putut genera overlay-ul text pentru export.");
          return;
        }

        const textOverlayPngBase64 = overlayDataUrl.replace(/^data:image\/png;base64,/, "");
        const displayImagePath = getDisplayProductImagePath(product);
        let productImageBase64: string | undefined;
        if (needsBase64Export(displayImagePath)) {
          productImageBase64 = await imageSourceToBase64(resolveProductImageSource(displayImagePath));
        }

        const result = await window.manacatApi.exportPost({
          product,
          template,
          textOverlayPngBase64,
          productImageBase64,
        });
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

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#ffedd5,_#fff7ed_40%,_#fffaf5_75%)] text-slate-900">
      <div className="flex h-full flex-col">
        <header className="h-20 border-b border-white/10 bg-gradient-to-r from-black via-zinc-900 to-neutral-800 shadow-lg shadow-black/30">
          <div className="flex h-full items-center gap-3 pl-0 pr-5">
            <img src={logo} alt="Logo Manacat" className="h-full w-auto rounded-lg object-contain" />
            <h1 className="text-2xl font-bold text-white">PostPilot</h1>
          </div>
        </header>

        <div className="mx-auto grid min-h-0 w-full max-w-[1680px] flex-1 gap-4 p-4 xl:grid-cols-12 xl:p-5">
          <section className="min-h-0 xl:col-span-4">
            <div className="h-full rounded-3xl border border-white/70 bg-white/75 p-4 shadow-xl shadow-orange-200/50 backdrop-blur">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-orange-700">
                <WandSparkles size={16} />
                Postează un produs
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

              {activePanel === "product" && (
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
              )}
              {activePanel === "template" && (
                  <TemplateControls template={template} onChange={setTemplate} />
              )}
            </div>
          </section>

          <section className="min-h-0 xl:col-span-8">
            <div className="flex h-full flex-col gap-4">
              <div className="min-h-0 flex-1 rounded-3xl border border-white/80 bg-white/80 p-3 shadow-xl shadow-orange-200/50 backdrop-blur">
                <CanvasPreview
                  ref={previewRef}
                  product={product}
                  template={template}
                  onProductImageLayoutChange={onProductImageLayoutChange}
                />
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white/75 p-4 shadow-lg shadow-orange-100/80 backdrop-blur">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex min-w-44 items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-300/60 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => void onExport()}
                    disabled={busy}
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
