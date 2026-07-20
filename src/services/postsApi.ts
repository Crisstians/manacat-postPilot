import { apiUrl } from "../config/api";

interface ApiErrorBody {
  error?: string;
  code?: string;
}

export interface PublishPostResult {
  success: boolean;
  facebookPostId: string;
  postLogId: string;
}

interface PublishPostResponse {
  data: PublishPostResult;
}

const parseError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error ?? "Cererea a eșuat.";
  } catch {
    return "Cererea a eșuat.";
  }
};

export const publishPost = async (
  accessToken: string,
  image: Blob,
  caption: string,
): Promise<PublishPostResult> => {
  const form = new FormData();
  const mimeType = image.type || "image/png";
  const file =
    image instanceof File
      ? image
      : new File([image], mimeType === "image/jpeg" ? "post.jpg" : "post.png", {
          type: mimeType,
        });
  form.append("image", file);
  form.append("caption", caption);

  const response = await fetch(apiUrl("/posts/publish"), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const result = (await response.json()) as PublishPostResponse;
  return result.data;
};

export const publishBulkPost = async (
  accessToken: string,
  images: Blob[],
  caption: string,
): Promise<PublishPostResult> => {
  const form = new FormData();
  images.forEach((image, index) => {
    const mimeType = image.type || "image/png";
    const file =
      image instanceof File
        ? image
        : new File([image], `post-${index + 1}.${mimeType === "image/jpeg" ? "jpg" : "png"}`, {
            type: mimeType,
          });
    form.append("images", file);
  });
  form.append("caption", caption);

  const response = await fetch(apiUrl("/posts/publish-bulk"), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const result = (await response.json()) as PublishPostResponse;
  return result.data;
};
