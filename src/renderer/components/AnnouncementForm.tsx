import type { ReactNode } from "react";
import type {
  AnnouncementDraft,
  HiringAnnouncementInput,
  ShopAnnouncementInput,
} from "../../shared/announcementTypes";
import type { AnnouncementPostType } from "../../shared/postTypes";

interface AnnouncementFormProps {
  postType: AnnouncementPostType;
  content: ShopAnnouncementInput | HiringAnnouncementInput;
  onChange: (content: ShopAnnouncementInput | HiringAnnouncementInput) => void;
  showFieldHints?: boolean;
}

const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) => (
  <div>
    <label className="label-text mb-1.5 block text-xs font-semibold" htmlFor={htmlFor}>
      {label}
    </label>
    {children}
  </div>
);

export function AnnouncementForm({
  postType,
  content,
  onChange,
  showFieldHints = false,
}: AnnouncementFormProps) {
  if (postType === "shop") {
    const shop = content as ShopAnnouncementInput;
    const update = (patch: Partial<ShopAnnouncementInput>) =>
      onChange({ ...shop, ...patch });

    return (
      <div className="space-y-4">
        <Field label="Titlu anunț *" htmlFor="shop-title">
          <input
            id="shop-title"
            className={`input input-sm w-full ${showFieldHints && !shop.title.trim() ? "input-field-missing" : ""}`}
            value={shop.title}
            onChange={(event) => update({ title: event.target.value })}
            placeholder="ex. Program de sărbători"
          />
        </Field>
        <Field label="Subtitlu / accent" htmlFor="shop-highlight">
          <input
            id="shop-highlight"
            className="input input-sm w-full"
            value={shop.highlight}
            onChange={(event) => update({ highlight: event.target.value })}
            placeholder="ex. Program special"
          />
        </Field>
        <Field label="Mesaj *" htmlFor="shop-message">
          <textarea
            id="shop-message"
            rows={5}
            className={`textarea textarea-sm w-full ${showFieldHints && !shop.message.trim() ? "input-field-missing" : ""}`}
            value={shop.message}
            onChange={(event) => update({ message: event.target.value })}
            placeholder="Detaliile anunțului pentru clienți..."
          />
        </Field>
        <Field label="Footer / call-to-action" htmlFor="shop-footer">
          <input
            id="shop-footer"
            className="input input-sm w-full"
            value={shop.footer}
            onChange={(event) => update({ footer: event.target.value })}
            placeholder="ex. Vă așteptăm în magazin!"
          />
        </Field>
      </div>
    );
  }

  const hiring = content as HiringAnnouncementInput;
  const update = (patch: Partial<HiringAnnouncementInput>) =>
    onChange({ ...hiring, ...patch });

  return (
    <div className="space-y-4">
      <Field label="Titlu job *" htmlFor="hiring-title">
        <input
          id="hiring-title"
          className={`input input-sm w-full ${showFieldHints && !hiring.jobTitle.trim() ? "input-field-missing" : ""}`}
          value={hiring.jobTitle}
          onChange={(event) => update({ jobTitle: event.target.value })}
          placeholder="ex. Consultant vânzări"
        />
      </Field>
      <Field label="Subtitlu / departament" htmlFor="hiring-subtitle">
        <input
          id="hiring-subtitle"
          className="input input-sm w-full"
          value={hiring.subtitle}
          onChange={(event) => update({ subtitle: event.target.value })}
          placeholder="ex. Showroom Manacat"
        />
      </Field>
      <Field label="Cerințe *" htmlFor="hiring-requirements">
        <textarea
          id="hiring-requirements"
          rows={6}
          className={`textarea textarea-sm w-full ${showFieldHints && !hiring.requirements.trim() ? "input-field-missing" : ""}`}
          value={hiring.requirements}
          onChange={(event) => update({ requirements: event.target.value })}
          placeholder="· Experiență&#10;· Disponibilitate..."
        />
      </Field>
      <Field label="Cum aplici" htmlFor="hiring-apply">
        <input
          id="hiring-apply"
          className="input input-sm w-full"
          value={hiring.applyLine}
          onChange={(event) => update({ applyLine: event.target.value })}
          placeholder="ex. Trimite CV la: hr@manacat.ro"
        />
      </Field>
    </div>
  );
}

export const getAnnouncementDraftLabel = (draft: AnnouncementDraft): string => {
  if (draft.postType === "shop") {
    return (draft.content as ShopAnnouncementInput).title.trim() || "Anunț magazin";
  }
  return (draft.content as HiringAnnouncementInput).jobTitle.trim() || "Anunț angajări";
};
