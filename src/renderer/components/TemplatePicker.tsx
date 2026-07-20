import { useEffect, useState } from "react";
import type { TemplateAsset } from "../../shared/types";
import { getTemplateIdFromPath, resolveTemplateImageSource } from "../templateImageSource";

const bundledTemplateModules = import.meta.glob(
  "../../assets/templatesPostari/*.{png,jpg,jpeg,webp}",
  { eager: true, import: "default" },
) as Record<string, string>;

const formatTemplateName = (filepath: string): string => {
  const filename = filepath.split("/").pop() ?? filepath;
  const base = filename.replace(/\.[^/.]+$/, "");
  const spaced = base.replace(/[-_]+/g, " ").replace(/([a-z])(\d)/gi, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const getBundledTemplates = (): TemplateAsset[] =>
  Object.entries(bundledTemplateModules)
    .sort(([left], [right]) => left.localeCompare(right, "ro"))
    .map(([key, url]) => ({
      id: key,
      name: formatTemplateName(key),
      path: url,
    }));

const resolveTemplatePreviewSrc = (path: string): string => resolveTemplateImageSource(path);

interface TemplatePickerProps {
  selectedPath: string;
  onSelect: (path: string) => void;
}

export function TemplatePicker({ selectedPath, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<TemplateAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadTemplates = async () => {
      setLoading(true);
      setError("");
      try {
        if (window.manacatApi?.listTemplates) {
          const items = await window.manacatApi.listTemplates();
          if (!active) return;
          setTemplates(items);
          if (items.length > 0 && !selectedPath) {
            onSelect(items[0].path);
          }
          return;
        }

        const fallbackItems = getBundledTemplates();
        if (!active) return;
        setTemplates(fallbackItems);
        if (fallbackItems.length > 0 && !selectedPath) {
          onSelect(fallbackItems[0].path);
        }
      } catch (caughtError) {
        if (!active) return;
        const reason =
          caughtError instanceof Error && caughtError.message ? ` (${caughtError.message})` : "";
        setError(`Nu am putut incarca template-urile${reason}.`);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTemplates();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load templates once on mount
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-base-content/60">
        <span className="loading loading-spinner loading-sm text-primary" />
        Incarcare template-uri...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-soft alert-error py-2 text-sm" role="alert">
        {error}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-base-content/60">
        Nu exista template-uri in <code>assets/templatesPostari</code>.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {templates.map((template) => {
        const isSelected = getTemplateIdFromPath(template.path) === getTemplateIdFromPath(selectedPath);
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.path)}
            className={`card overflow-hidden border text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isSelected
                ? "scale-[1.02] border-primary shadow-md shadow-primary/15 ring-2 ring-primary/30"
                : "border-base-300/80 hover:scale-[1.02] hover:border-primary/50 hover:shadow-md hover:shadow-base-content/10"
            }`}
          >
            <div className="aspect-square w-full bg-base-200">
              <img
                src={resolveTemplatePreviewSrc(template.path)}
                alt={template.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="truncate px-2 py-1.5 text-xs font-medium text-base-content/80">{template.name}</p>
          </button>
        );
      })}
    </div>
  );
}
