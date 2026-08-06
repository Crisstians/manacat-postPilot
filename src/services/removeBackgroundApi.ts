import { apiUrl } from "../config/api";

interface ApiErrorBody {
  error?: string;
  code?: string;
  message?: string;
}

const parseError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error ?? body.message ?? "Cererea de eliminare fundal a eșuat.";
  } catch {
    return `Eliminarea fundalului a eșuat (${response.status}).`;
  }
};

export interface RemoveBackgroundParams {
  accessToken: string;
  /** Local / blob image to upload. */
  image?: Blob;
  /** Public CDN / catalog URL. Prefer this when available. */
  imageUrl?: string;
  size?: "auto" | "preview" | "full" | "medium" | "hd" | "4k";
}

/**
 * POST /api/v1/remove-background — Railway proxy to remove.bg.
 * Returns a transparent PNG blob.
 */
export const removeBackground = async ({
  accessToken,
  image,
  imageUrl,
  size = "auto",
}: RemoveBackgroundParams): Promise<Blob> => {
  const trimmedUrl = imageUrl?.trim();
  if (!image && !trimmedUrl) {
    throw new Error("Nu există imagine de procesat.");
  }

  const form = new FormData();
  if (trimmedUrl && /^https?:\/\//i.test(trimmedUrl)) {
    form.append("imageUrl", trimmedUrl);
  } else if (image) {
    const mimeType = image.type || "image/jpeg";
    const extension = mimeType.includes("png") ? "png" : "jpg";
    const file =
      image instanceof File
        ? image
        : new File([image], `product.${extension}`, { type: mimeType });
    form.append("image", file);
  } else {
    throw new Error("Sursa imaginii nu e validă.");
  }
  form.append("size", size);

  const response = await fetch(apiUrl("/remove-background"), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    throw new Error(await parseError(response));
  }

  return new Blob([await response.arrayBuffer()], { type: "image/png" });
};
