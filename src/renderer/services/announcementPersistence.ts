import { createEmptyAnnouncementSession, hasMeaningfulAnnouncementSession, parseAnnouncementSession, type AnnouncementSessionSnapshot } from "../../shared/announcementStorage";
import type { AnnouncementPostType } from "../../shared/postTypes";

export const announcementStorageKey = (userId: string, postType: AnnouncementPostType): string =>
  `postpilot.announcement.v1.${postType}.${userId}`;

export const loadAnnouncementSession = (
  userId: string,
  postType: AnnouncementPostType,
  defaultBackground: string,
): { session: AnnouncementSessionSnapshot; restored: boolean } => {
  const raw = localStorage.getItem(announcementStorageKey(userId, postType));
  const parsed = parseAnnouncementSession(raw, postType);
  if (!parsed) {
    return {
      session: createEmptyAnnouncementSession(postType, defaultBackground),
      restored: false,
    };
  }
  return {
    session: parsed,
    restored: hasMeaningfulAnnouncementSession(parsed),
  };
};

export const saveAnnouncementSession = (
  userId: string,
  postType: AnnouncementPostType,
  snapshot: Pick<AnnouncementSessionSnapshot, "activePanel" | "draft">,
  defaultBackground: string,
): void => {
  const payload: AnnouncementSessionSnapshot = {
    ...snapshot,
    postType,
    savedAt: new Date().toISOString(),
    draft:
      snapshot.draft.template.backgroundImagePath || defaultBackground
        ? snapshot.draft
        : {
            ...snapshot.draft,
            template: {
              ...snapshot.draft.template,
              backgroundImagePath: defaultBackground,
            },
          },
  };

  localStorage.setItem(announcementStorageKey(userId, postType), JSON.stringify(payload));
};

export const renderAnnouncementImageBlob = async (
  exportFullImage?: () => Promise<string | null>,
): Promise<Blob | null> => {
  const dataUrl = await exportFullImage?.();
  if (!dataUrl) return null;
  const response = await fetch(dataUrl);
  return response.blob();
};
