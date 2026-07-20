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
  const raw = await response.blob();

  if (!window.manacatApi?.prepareImageForFacebook) {
    return raw;
  }

  const buffer = await raw.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const result = await window.manacatApi.prepareImageForFacebook(btoa(binary));
  if (!result.success || !result.imageBase64) {
    throw new Error(result.error ?? "Nu s-a putut pregati imaginea pentru Facebook.");
  }

  const mimeType = result.mimeType ?? "image/png";
  const decoded = atob(result.imageBase64);
  const out = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) {
    out[i] = decoded.charCodeAt(i);
  }
  return new Blob([out], { type: mimeType });
};
