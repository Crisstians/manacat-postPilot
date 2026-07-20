import { useCallback, useMemo } from "react";
import type { TemplateLayout } from "../../shared/types";
import { getTemplateIdFromPath } from "../templateImageSource";
import { TemplatePicker } from "./TemplatePicker";

interface TemplateControlsProps {
  template: TemplateLayout;
  onChange: (template: TemplateLayout) => void;
}

const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="form-section space-y-3">
    <h3 className="app-section-title">{title}</h3>
    {children}
  </section>
);

export function TemplateControls({ template, onChange }: TemplateControlsProps) {
  const onSelectTemplate = useCallback(
    (path: string) => {
      onChange({ ...template, backgroundImagePath: path });
    },
    [onChange, template],
  );

  const selectedTemplateLabel = useMemo(() => {
    if (!template.backgroundImagePath) return "Niciun șablon selectat";
    const filename = template.backgroundImagePath.split("/").pop() ?? template.backgroundImagePath;
    const base = filename.replace(/\.[^/.]+$/, "");
    return base.replace(/[-_]+/g, " ").replace(/([a-z])(\d)/gi, "$1 $2");
  }, [template.backgroundImagePath]);

  const hasBackground = Boolean(template.backgroundImagePath);

  return (
    <div className="space-y-3 text-base-content">
      <FormSection title="Fundal postare">
        <p className="helper-text text-xs">
          Alege un șablon de fundal pentru postarea curentă. Poți schimba șablonul oricând.
        </p>
        <div id="template-picker">
          <TemplatePicker
            selectedPath={template.backgroundImagePath}
            onSelect={onSelectTemplate}
          />
        </div>
      </FormSection>

      <FormSection title="Detalii șablon">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label-text mb-1 text-xs font-semibold">Șablon activ</p>
            <p className="truncate text-sm font-medium capitalize text-base-content/85">
              {selectedTemplateLabel}
            </p>
          </div>
          <div>
            <p className="label-text mb-1 text-xs font-semibold">Status</p>
            <span
              className={`badge badge-xs ${
                hasBackground ? "badge-soft badge-success" : "badge-soft badge-warning"
              }`}
            >
              {hasBackground ? "Fundal selectat" : "Lipsește fundalul"}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-base-300/50 bg-base-200/40 px-3 py-2">
          <p className="label-text mb-1 text-xs font-semibold">Zonă poză produs (fixă)</p>
          <p className="helper-text text-xs">
            x {template.productLayer.x}, y {template.productLayer.y}, lățime{" "}
            {template.productLayer.width}, înălțime {template.productLayer.height}
          </p>
          <p className="helper-text mt-1 text-[10px]">
            ID șablon: {getTemplateIdFromPath(template.backgroundImagePath) || "—"}
          </p>
        </div>
      </FormSection>
    </div>
  );
}
