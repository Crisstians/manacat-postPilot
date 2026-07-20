import {
  createAnnouncementTemplate,
  createDefaultAnnouncementContent,
  type AnnouncementDraft,
} from "./announcementTypes";
import type { AnnouncementPostType } from "./postTypes";

export const createAnnouncementDraft = (
  postType: AnnouncementPostType,
  backgroundImagePath = "",
): AnnouncementDraft => ({
  id: crypto.randomUUID(),
  postType,
  content: createDefaultAnnouncementContent(postType),
  template: createAnnouncementTemplate(backgroundImagePath),
  facebookCaption: "",
  facebookCaptionTouched: false,
});
