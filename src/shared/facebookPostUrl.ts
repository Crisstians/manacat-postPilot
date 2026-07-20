/** Construiește URL-ul public al unei postări Facebook din ID-ul Graph API. */
export const buildFacebookPostUrl = (facebookPostId: string): string => {
  const trimmed = facebookPostId.trim();
  if (!trimmed) {
    return "https://www.facebook.com/";
  }

  const separator = trimmed.indexOf("_");
  if (separator > 0 && separator < trimmed.length - 1) {
    const pageId = trimmed.slice(0, separator);
    const postId = trimmed.slice(separator + 1);
    return `https://www.facebook.com/${pageId}/posts/${postId}`;
  }

  return `https://www.facebook.com/${encodeURIComponent(trimmed)}`;
};

export const openFacebookPostInBrowser = async (facebookPostId: string): Promise<void> => {
  const url = buildFacebookPostUrl(facebookPostId);
  if (window.manacatApi?.openExternal) {
    await window.manacatApi.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
};
