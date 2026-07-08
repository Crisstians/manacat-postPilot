import { useCallback } from "react";
import type { TemplateLayout } from "../../shared/types";
import { TemplatePicker } from "./TemplatePicker";

interface TemplateControlsProps {
  template: TemplateLayout;
  onChange: (template: TemplateLayout) => void;
}

export function TemplateControls({ template, onChange }: TemplateControlsProps) {
  const onSelectTemplate = useCallback(
    (path: string) => {
      onChange({ ...template, backgroundImagePath: path });
    },
    [onChange, template],
  );

  return (
    <div className="space-y-3 rounded-2xl border border-orange-100 bg-white p-4 text-slate-800">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-700">Șabloane</h2>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">Alege fundal</p>
        <TemplatePicker
          selectedPath={template.backgroundImagePath}
          onSelect={onSelectTemplate}
        />
      </div>
      <p className="text-xs text-slate-500">
        Slotul pentru poza produsului este fix: x {template.productLayer.x}, y {template.productLayer.y},
        w {template.productLayer.width}, h {template.productLayer.height}
      </p>
    </div>
  );
}
