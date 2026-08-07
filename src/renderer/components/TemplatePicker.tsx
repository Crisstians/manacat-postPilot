import { useEffect, useState } from "react";
import type { ApiTemplateKind, ApiTemplateListItem } from "../../shared/apiTemplate";
import type { TemplateLayout } from "../../shared/types";
import { templateLayoutFromApi } from "../../shared/apiTemplate";
import * as templatesApi from "../../services/templatesApi";
import { useAuth } from "../context/AuthContext";
import { resolveTemplateImageSource } from "../templateImageSource";

interface TemplatePickerProps {
  selectedId: string;
  selectedImageUrl: string;
  onSelect: (layout: TemplateLayout) => void;
  /** Filter API list (product editor vs announcement). */
  kind?: ApiTemplateKind;
}

export function TemplatePicker({
  selectedId,
  selectedImageUrl,
  onSelect,
  kind = "product",
}: TemplatePickerProps) {
  const { accessToken } = useAuth();
  const [templates, setTemplates] = useState<ApiTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadTemplates = async () => {
      if (!accessToken) {
        if (!active) return;
        setError("Trebuie să fii autentificat pentru a încărca șabloanele.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const result = await templatesApi.listTemplates({
          kind,
          accessToken,
          signal: controller.signal,
          limit: 50,
        });
        if (!active) return;
        setTemplates(result.items);

        if (result.items.length > 0 && !selectedImageUrl) {
          const first = result.items[0]!;
          setSelectingId(first.id);
          try {
            const detail = await templatesApi.getTemplate(first.id, accessToken, controller.signal);
            if (!active) return;
            onSelect(templateLayoutFromApi(detail));
          } finally {
            if (active) setSelectingId(null);
          }
        }
      } catch (caughtError) {
        if (!active || controller.signal.aborted) return;
        const reason =
          caughtError instanceof Error && caughtError.message ? ` (${caughtError.message})` : "";
        setError(`Nu am putut încărca șabloanele${reason}.`);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTemplates();
    return () => {
      active = false;
      controller.abort();
    };
    // Load once per token/kind; auto-select only when empty on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, kind]);

  const handleSelect = async (item: ApiTemplateListItem) => {
    if (!accessToken || selectingId) return;
    setSelectingId(item.id);
    setError("");
    try {
      const detail = await templatesApi.getTemplate(item.id, accessToken);
      onSelect(templateLayoutFromApi(detail));
    } catch (caughtError) {
      const reason =
        caughtError instanceof Error && caughtError.message ? ` (${caughtError.message})` : "";
      setError(`Nu am putut încărca șablonul${reason}.`);
    } finally {
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/60">
        <span className="loading loading-spinner loading-sm text-primary" />
        Încărcare șabloane...
      </div>
    );
  }

  if (error && templates.length === 0) {
    return (
      <div className="alert alert-soft alert-error py-2 text-sm" role="alert">
        {error}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-base-content/60">
        Nu există șabloane pe server. Un administrator poate publica șabloane noi din acest panou.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <div className="alert alert-soft alert-error py-2 text-sm" role="alert">
          {error}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {templates.map((template) => {
          const isSelected =
            template.id === selectedId ||
            (selectedImageUrl !== "" && template.imageUrl === selectedImageUrl);
          const isBusy = selectingId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              disabled={Boolean(selectingId)}
              onClick={() => void handleSelect(template)}
              className={`card overflow-hidden border text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 ${
                isSelected
                  ? "scale-[1.02] border-primary shadow-md shadow-primary/15 ring-2 ring-primary/30"
                  : "border-base-300/80 hover:scale-[1.02] hover:border-primary/50 hover:shadow-md hover:shadow-base-content/10"
              }`}
            >
              <div className="relative aspect-square w-full bg-base-200">
                <img
                  src={resolveTemplateImageSource(template.imageUrl)}
                  alt={template.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                {isBusy ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-base-100/60">
                    <span className="loading loading-spinner loading-sm text-primary" />
                  </div>
                ) : null}
              </div>
              <p className="truncate px-2 py-1.5 text-xs font-medium text-base-content/80">
                {template.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
