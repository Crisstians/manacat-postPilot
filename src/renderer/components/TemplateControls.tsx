import { useCallback, useMemo, useRef, useState } from "react";
import type { ApiTemplateKind } from "../../shared/apiTemplate";
import { looksLikeApiTemplateId, templateLayoutFromApi } from "../../shared/apiTemplate";
import type { TemplateLayout } from "../../shared/types";
import * as templatesApi from "../../services/templatesApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { TemplatePicker } from "./TemplatePicker";

interface TemplateControlsProps {
  template: TemplateLayout;
  onChange: (template: TemplateLayout) => void;
  kind?: ApiTemplateKind;
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

async function blobFromBackground(path: string): Promise<Blob> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Nu am putut citi imaginea de fundal.");
  }
  return response.blob();
}

export function TemplateControls({ template, onChange, kind = "product" }: TemplateControlsProps) {
  const { user, accessToken } = useAuth();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === "ADMIN";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishName, setPublishName] = useState(template.name);
  const [publishKind, setPublishKind] = useState<ApiTemplateKind>(kind === "both" ? "product" : kind);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [useCurrentBackground, setUseCurrentBackground] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  const onSelectTemplate = useCallback(
    (next: TemplateLayout) => {
      onChange(next);
    },
    [onChange],
  );

  const hasBackground = Boolean(template.backgroundImagePath);
  const canUpdateExisting = looksLikeApiTemplateId(template.id);

  const selectedLabel = useMemo(() => {
    if (template.name?.trim()) return template.name;
    if (!template.backgroundImagePath) return "Niciun șablon selectat";
    return "Șablon fără nume";
  }, [template.backgroundImagePath, template.name]);

  const openPublish = () => {
    setPublishName(template.name || "Șablon nou");
    setPublishKind(kind === "both" ? "product" : kind);
    setImageFile(null);
    setUseCurrentBackground(Boolean(template.backgroundImagePath));
    setPublishOpen(true);
  };

  const resolveImageBlob = async (): Promise<Blob> => {
    if (!useCurrentBackground) {
      if (!imageFile) throw new Error("Selectează o imagine de fundal.");
      return imageFile;
    }
    if (!template.backgroundImagePath) {
      throw new Error("Nu există fundal curent de folosit.");
    }
    return blobFromBackground(template.backgroundImagePath);
  };

  const handlePublishNew = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      const image = await resolveImageBlob();
      const created = await templatesApi.createTemplate(accessToken, {
        name: publishName.trim() || "Șablon nou",
        kind: publishKind,
        layout: { ...template, name: publishName.trim() || template.name },
        image,
      });
      onChange(templateLayoutFromApi(created));
      setPickerKey((k) => k + 1);
      setPublishOpen(false);
      showSuccess("Șablon publicat pe server.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Publicarea a eșuat.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateExisting = async () => {
    if (!accessToken || !canUpdateExisting) return;
    setBusy(true);
    try {
      let image: Blob | undefined;
      if (publishOpen) {
        try {
          image = await resolveImageBlob();
        } catch {
          image = undefined;
        }
      }
      const updated = await templatesApi.updateTemplate(accessToken, template.id, {
        name: publishOpen ? publishName.trim() || template.name : template.name,
        kind: publishOpen ? publishKind : undefined,
        layout: template,
        image,
      });
      onChange(templateLayoutFromApi(updated));
      setPickerKey((k) => k + 1);
      setPublishOpen(false);
      showSuccess("Șablon actualizat pe server.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Actualizarea a eșuat.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = async () => {
    if (!accessToken || !canUpdateExisting) return;
    if (!window.confirm("Retragi acest șablon? Nu va mai apărea în listă pentru angajați.")) {
      return;
    }
    setBusy(true);
    try {
      await templatesApi.deactivateTemplate(accessToken, template.id);
      setPickerKey((k) => k + 1);
      showSuccess("Șablon retras de pe server.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Retragerea a eșuat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-base-content">
      <FormSection title="Fundal postare">
        <p className="helper-text text-xs">
          Alege un șablon de pe server. Schimbarea înlocuiește fundalul și layout-ul (poziții text /
          zonă produs).
        </p>
        <div id="template-picker">
          <TemplatePicker
            key={pickerKey}
            selectedId={template.id}
            selectedImageUrl={template.backgroundImagePath}
            onSelect={onSelectTemplate}
            kind={kind}
          />
        </div>
      </FormSection>

      <FormSection title="Detalii șablon">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="label-text mb-1 text-xs font-semibold">Șablon activ</p>
            <p className="truncate text-sm font-medium text-base-content/85">{selectedLabel}</p>
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
            {template.width}×{template.height} · ID: {template.id || "—"}
          </p>
        </div>
      </FormSection>

      {isAdmin ? (
        <FormSection title="Administrare șabloane">
          <p className="helper-text text-xs">
            Doar administratorii pot publica sau actualiza șabloane pe server.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openPublish}
              disabled={busy}
            >
              Publică șablon nou
            </button>
            {canUpdateExisting ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => void handleUpdateExisting()}
                  disabled={busy || !hasBackground}
                >
                  Actualizează pe server
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => void handleDeactivate()}
                  disabled={busy}
                >
                  Retrage
                </button>
              </>
            ) : null}
          </div>

          {publishOpen ? (
            <div className="space-y-3 rounded-lg border border-base-300/60 bg-base-100 p-3">
              <label className="form-control w-full">
                <span className="label-text text-xs font-semibold">Nume</span>
                <input
                  className="input input-bordered input-sm"
                  value={publishName}
                  onChange={(e) => setPublishName(e.target.value)}
                  maxLength={200}
                />
              </label>

              <label className="form-control w-full">
                <span className="label-text text-xs font-semibold">Tip</span>
                <select
                  className="select select-bordered select-sm"
                  value={publishKind}
                  onChange={(e) => setPublishKind(e.target.value as ApiTemplateKind)}
                >
                  <option value="product">Produs</option>
                  <option value="announcement">Anunț</option>
                  <option value="both">Ambele</option>
                </select>
              </label>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="radio radio-sm"
                    checked={useCurrentBackground}
                    onChange={() => setUseCurrentBackground(true)}
                    disabled={!hasBackground}
                  />
                  Folosește fundalul curent
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="radio radio-sm"
                    checked={!useCurrentBackground}
                    onChange={() => setUseCurrentBackground(false)}
                  />
                  Încarcă fișier nou
                </label>
                {!useCurrentBackground ? (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="file-input file-input-bordered file-input-sm w-full"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => void handlePublishNew()}
                >
                  {busy ? <span className="loading loading-spinner loading-xs" /> : null}
                  Publică
                </button>
                {canUpdateExisting ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy}
                    onClick={() => void handleUpdateExisting()}
                  >
                    Salvează pe șablonul curent
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => setPublishOpen(false)}
                >
                  Anulează
                </button>
              </div>
            </div>
          ) : null}
        </FormSection>
      ) : null}
    </div>
  );
}
