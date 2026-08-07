import { apiUrl } from "../config/api";
import type {
  ApiTemplateDetail,
  ApiTemplateKind,
  ApiTemplateListItem,
  ListTemplatesResponse,
} from "../shared/apiTemplate";
import type { TemplateLayout } from "../shared/types";
import { layoutPayloadForApi } from "../shared/apiTemplate";

interface ApiErrorBody {
  error?: string;
  code?: string;
}

interface TemplateDetailResponse {
  data: ApiTemplateDetail;
}

export interface ListTemplatesOptions {
  kind?: ApiTemplateKind;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
  accessToken?: string | null;
  signal?: AbortSignal;
}

export interface PublishTemplateInput {
  name: string;
  kind: ApiTemplateKind;
  layout: TemplateLayout;
  image: Blob;
  sortOrder?: number;
  isActive?: boolean;
  slug?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  kind?: ApiTemplateKind;
  layout?: TemplateLayout;
  image?: Blob;
  sortOrder?: number;
  isActive?: boolean;
  slug?: string;
}

const parseError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error ?? "Cererea a eșuat.";
  } catch {
    return "Cererea a eșuat.";
  }
};

const authHeaders = (accessToken: string): HeadersInit => ({
  Authorization: `Bearer ${accessToken}`,
});

export const listTemplates = async (
  options: ListTemplatesOptions = {},
): Promise<ListTemplatesResponse> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    activeOnly: String(options.activeOnly ?? true),
  });
  if (options.kind) {
    params.set("kind", options.kind);
  }

  const headers: HeadersInit = {};
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(apiUrl(`/templates?${params.toString()}`), {
    method: "GET",
    headers,
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as ListTemplatesResponse;
};

export const getTemplate = async (
  id: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<ApiTemplateDetail> => {
  const response = await fetch(apiUrl(`/templates/${encodeURIComponent(id)}`), {
    method: "GET",
    headers: authHeaders(accessToken),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const result = (await response.json()) as TemplateDetailResponse;
  return result.data;
};

export const createTemplate = async (
  accessToken: string,
  input: PublishTemplateInput,
): Promise<ApiTemplateDetail> => {
  const form = new FormData();
  const mimeType = input.image.type || "image/png";
  const file =
    input.image instanceof File
      ? input.image
      : new File([input.image], mimeType === "image/jpeg" ? "template.jpg" : "template.png", {
          type: mimeType,
        });

  form.append("image", file);
  form.append("name", input.name);
  form.append("kind", input.kind);
  form.append("layout", JSON.stringify(layoutPayloadForApi(input.layout)));
  if (input.sortOrder !== undefined) form.append("sortOrder", String(input.sortOrder));
  if (input.isActive !== undefined) form.append("isActive", String(input.isActive));
  if (input.slug) form.append("slug", input.slug);

  const response = await fetch(apiUrl("/templates"), {
    method: "POST",
    headers: authHeaders(accessToken),
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const result = (await response.json()) as TemplateDetailResponse;
  return result.data;
};

export const updateTemplate = async (
  accessToken: string,
  id: string,
  input: UpdateTemplateInput,
): Promise<ApiTemplateDetail> => {
  const form = new FormData();
  if (input.name !== undefined) form.append("name", input.name);
  if (input.kind !== undefined) form.append("kind", input.kind);
  if (input.layout !== undefined) {
    form.append("layout", JSON.stringify(layoutPayloadForApi(input.layout)));
  }
  if (input.sortOrder !== undefined) form.append("sortOrder", String(input.sortOrder));
  if (input.isActive !== undefined) form.append("isActive", String(input.isActive));
  if (input.slug !== undefined) form.append("slug", input.slug);
  if (input.image) {
    const mimeType = input.image.type || "image/png";
    const file =
      input.image instanceof File
        ? input.image
        : new File([input.image], mimeType === "image/jpeg" ? "template.jpg" : "template.png", {
            type: mimeType,
          });
    form.append("image", file);
  }

  const response = await fetch(apiUrl(`/templates/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: form,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const result = (await response.json()) as TemplateDetailResponse;
  return result.data;
};

export const deactivateTemplate = async (
  accessToken: string,
  id: string,
): Promise<ApiTemplateDetail> => {
  const response = await fetch(apiUrl(`/templates/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const result = (await response.json()) as TemplateDetailResponse;
  return result.data;
};

export type { ApiTemplateDetail, ApiTemplateKind, ApiTemplateListItem, ListTemplatesResponse };
