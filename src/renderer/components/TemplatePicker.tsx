import { Spinner } from "flowbite-react";
import { useEffect, useState } from "react";
import type { TemplateAsset } from "../../shared/types";

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
          if (items.length > 0) {
            onSelect(items[0].path);
          }
          return;
        }

        const fallbackItems = getBundledTemplates();
        if (!active) return;
        setTemplates(fallbackItems);
        if (fallbackItems.length > 0) {
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
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner size="sm" />
        Incarcare template-uri...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nu exista template-uri in <code>assets/templatesPostari</code>.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {templates.map((template) => {
        const isSelected = template.path === selectedPath;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.path)}
            className={`overflow-hidden rounded-xl border-2 text-left transition ${
              isSelected
                ? "border-orange-500 ring-2 ring-orange-200"
                : "border-orange-100 hover:border-orange-300"
            }`}
          >
            <div className="aspect-square w-full bg-slate-100">
              <img
                src={window.manacatApi?.toFileUrl ? window.manacatApi.toFileUrl(template.path) : template.path}
                alt={template.name}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="truncate px-2 py-1.5 text-xs font-medium text-slate-700">{template.name}</p>
          </button>
        );
      })}
    </div>
  );
}
