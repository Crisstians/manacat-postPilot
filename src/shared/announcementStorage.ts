import { createAnnouncementDraft } from "./announcementDrafts";
import type { AnnouncementDraft } from "./announcementTypes";
import type { AnnouncementPostType } from "./postTypes";
import { normalizeTemplateLayout } from "./textBlockLayout";

export interface AnnouncementSessionSnapshot {
  postType: AnnouncementPostType;
  savedAt: string;
  activePanel: "content" | "template";
  draft: AnnouncementDraft;
}

export const createEmptyAnnouncementSession = (
  postType: AnnouncementPostType,
  defaultBackground = "",
): AnnouncementSessionSnapshot => ({
  postType,
  savedAt: new Date().toISOString(),
  activePanel: "content",
  draft: createAnnouncementDraft(postType, defaultBackground),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseAnnouncementSession = (
  raw: string | null,
  expectedPostType: AnnouncementPostType,
): AnnouncementSessionSnapshot | null => {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.draft)) return null;
    if (parsed.postType !== expectedPostType) return null;

    const draft = parsed.draft as unknown as AnnouncementDraft;
    if (draft.postType !== expectedPostType) return null;

    return {
      postType: expectedPostType,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      activePanel: parsed.activePanel === "template" ? "template" : "content",
      draft: {
        ...draft,
        template: normalizeTemplateLayout(draft.template),
      },
    };
  } catch {
    return null;
  }
};

export const hasMeaningfulAnnouncementSession = (session: AnnouncementSessionSnapshot): boolean => {
  const { draft } = session;
  if (draft.facebookCaptionTouched) return true;

  if (draft.postType === "shop") {
    const content = draft.content as AnnouncementDraft["content"] & {
      title?: string;
      message?: string;
    };
    return Boolean(content.title?.trim()) || Boolean(content.message?.trim());
  }

  const content = draft.content as AnnouncementDraft["content"] & {
    jobTitle?: string;
    requirements?: string;
  };
  return Boolean(content.jobTitle?.trim()) || Boolean(content.requirements?.trim());
};
