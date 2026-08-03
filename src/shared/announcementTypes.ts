import { defaultTemplate, TEMPLATE_EXPORT_HEIGHT, TEMPLATE_EXPORT_WIDTH } from "./defaults";
import type { AnnouncementPostType } from "./postTypes";
import { normalizeTemplateTextBlocks } from "./textBlockLayout";
import type { TemplateLayout, TextBlock } from "./types";

export interface ShopAnnouncementInput {
  title: string;
  highlight: string;
  message: string;
  footer: string;
}

export interface HiringAnnouncementInput {
  jobTitle: string;
  subtitle: string;
  requirements: string;
  applyLine: string;
}

export type AnnouncementContent =
  | { postType: "shop"; data: ShopAnnouncementInput }
  | { postType: "hiring"; data: HiringAnnouncementInput };

export interface AnnouncementDraft {
  id: string;
  postType: AnnouncementPostType;
  content: ShopAnnouncementInput | HiringAnnouncementInput;
  template: TemplateLayout;
  facebookCaption: string;
  facebookCaptionTouched: boolean;
}

export const defaultShopAnnouncement = (): ShopAnnouncementInput => ({
  title: "Anunț important",
  highlight: "Program magazin",
  message: "Vă informăm despre modificările de program. Pentru detalii, contactați-ne.",
  footer: "Vă așteptăm în magazin!",
});

export const defaultHiringAnnouncement = (): HiringAnnouncementInput => ({
  jobTitle: "Post vacant",
  subtitle: "Echipa Manacat",
  requirements: "· Experiență în domeniu\n· Spirit de echipă\n· Disponibilitate imediată",
  applyLine: "Trimite CV la: hr@manacat.ro",
});

export const createDefaultAnnouncementContent = (
  postType: AnnouncementPostType,
): ShopAnnouncementInput | HiringAnnouncementInput =>
  postType === "shop" ? defaultShopAnnouncement() : defaultHiringAnnouncement();

export type ShopAnnouncementLayout = {
  title: TextBlock;
  highlight: TextBlock;
  body: TextBlock;
  footer: TextBlock;
};

export type HiringAnnouncementLayout = {
  title: TextBlock;
  subtitle: TextBlock;
  body: TextBlock;
  footer: TextBlock;
};

const shopAnnouncementLayout = (blocks: TemplateLayout["textBlocks"]): ShopAnnouncementLayout => ({
  title: blocks.productName,
  highlight: blocks.subtitle,
  body: blocks.description,
  footer: blocks.price,
});

const hiringAnnouncementLayout = (blocks: TemplateLayout["textBlocks"]): HiringAnnouncementLayout => ({
  title: blocks.productName,
  subtitle: blocks.subtitle,
  body: blocks.description,
  footer: blocks.feature,
});

export const getAnnouncementLayout = (
  postType: AnnouncementPostType,
  textBlocks: TemplateLayout["textBlocks"] = defaultTemplate.textBlocks,
) =>
  postType === "shop" ? shopAnnouncementLayout(textBlocks) : hiringAnnouncementLayout(textBlocks);

export const createAnnouncementTemplate = (backgroundImagePath = ""): TemplateLayout => {
  const base = defaultTemplate.textBlocks;
  return {
    id: `announcement-${TEMPLATE_EXPORT_WIDTH}x${TEMPLATE_EXPORT_HEIGHT}`,
    name: `Anunț ${TEMPLATE_EXPORT_WIDTH}x${TEMPLATE_EXPORT_HEIGHT}`,
    width: TEMPLATE_EXPORT_WIDTH,
    height: TEMPLATE_EXPORT_HEIGHT,
    backgroundImagePath,
    productLayer: { ...defaultTemplate.productLayer },
    textBlocks: normalizeTemplateTextBlocks({
      ...base,
      productName: { ...base.productName, fitMode: "boxFit" },
      subtitle: { ...base.subtitle, fitMode: "boxFit" },
      description: {
        ...base.description,
        fitMode: "boxFit",
        height: Math.round(69 * 1.25 * 8),
      },
      price: {
        ...base.price,
        y: 2050,
        fontSize: 96,
        maxWidth: 1200,
        height: Math.round(96 * 1.1),
        fitMode: "boxFit",
      },
      feature: {
        ...base.feature,
        y: 2180,
        fontSize: 96,
        maxWidth: 1100,
        height: Math.round(96 * 1.1),
        fitMode: "boxFit",
      },
    }),
  };
};

export const isShopAnnouncement = (
  draft: AnnouncementDraft,
): draft is AnnouncementDraft & { postType: "shop"; content: ShopAnnouncementInput } =>
  draft.postType === "shop";

export const isHiringAnnouncement = (
  draft: AnnouncementDraft,
): draft is AnnouncementDraft & { postType: "hiring"; content: HiringAnnouncementInput } =>
  draft.postType === "hiring";

export const getAnnouncementContent = (
  draft: AnnouncementDraft,
): ShopAnnouncementInput | HiringAnnouncementInput => draft.content;

export const generateShopCaption = (content: ShopAnnouncementInput): string =>
  [content.title, content.highlight, content.message, content.footer].filter(Boolean).join("\n\n");

export const generateHiringCaption = (content: HiringAnnouncementInput): string =>
  [
    `Angajăm: ${content.jobTitle}`,
    content.subtitle,
    content.requirements,
    content.applyLine,
  ]
    .filter(Boolean)
    .join("\n\n");

export const generateAnnouncementCaption = (draft: AnnouncementDraft): string =>
  draft.postType === "shop"
    ? generateShopCaption(draft.content as ShopAnnouncementInput)
    : generateHiringCaption(draft.content as HiringAnnouncementInput);

export const getAnnouncementMissingLabels = (draft: AnnouncementDraft): string[] => {
  const missing: string[] = [];
  if (!draft.template.backgroundImagePath) missing.push("fundal");

  if (draft.postType === "shop") {
    const content = draft.content as ShopAnnouncementInput;
    if (!content.title.trim()) missing.push("titlu");
    if (!content.message.trim()) missing.push("mesaj");
    return missing;
  }

  const content = draft.content as HiringAnnouncementInput;
  if (!content.jobTitle.trim()) missing.push("titlu job");
  if (!content.requirements.trim()) missing.push("cerințe");
  return missing;
};

export const isAnnouncementExportReady = (draft: AnnouncementDraft): boolean =>
  getAnnouncementMissingLabels(draft).length === 0;
