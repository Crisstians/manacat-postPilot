import { Copy, RotateCcw } from "lucide-react";

interface CaptionEditorProps {
  id: string;
  label: string;
  value: string;
  suggestedCaption: string;
  touched: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
  onCopy: () => void;
  rows?: number;
  placeholder?: string;
}

export function CaptionEditor({
  id,
  label,
  value,
  suggestedCaption,
  touched,
  onChange,
  onReset,
  onCopy,
  rows = 5,
  placeholder = "Textul care va însoți postarea pe Facebook...",
}: CaptionEditorProps) {
  return (
    <section className="form-section space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="app-section-title block">
          {label}
        </label>
        <div className="flex items-center gap-1">
          {touched ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={onReset}
              title="Regenerează caption automat"
            >
              <RotateCcw size={12} />
              Auto
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-outline btn-primary btn-xs"
            onClick={onCopy}
            disabled={!value.trim()}
            title="Copiază caption în clipboard"
          >
            <Copy size={12} />
            Copiază
          </button>
        </div>
      </div>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="textarea textarea-sm w-full"
        placeholder={placeholder}
      />
      {!touched ? (
        <p className="helper-text text-[11px]">Caption generat automat din datele produsului.</p>
      ) : null}
      {touched && !value.trim() ? (
        <p className="helper-text text-[11px] text-warning">
          Caption gol — se va folosi varianta sugerată la publicare.
        </p>
      ) : null}
      {touched && value.trim() && value !== suggestedCaption ? (
        <p className="helper-text text-[11px]">Caption personalizat.</p>
      ) : null}
    </section>
  );
}
