import { apiUrl } from "../config/api";

interface ApiErrorBody {
  error?: string;
  code?: string;
}

/** Subset of manacat-api ProductDto used by PostPilot catalog search. */
export interface CatalogProduct {
  productId: number;
  sku: string;
  name: string;
  nameAlt: string;
  brand: string;
  category: string;
  price: number;
  shortDescription: string;
  description: string;
  image: string;
  images: string[];
}

export interface ListProductsResponse {
  items: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  version: number;
}

export interface SearchProductsOptions {
  page?: number;
  limit?: number;
  accessToken?: string | null;
  signal?: AbortSignal;
}

const parseError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error ?? "Cererea a eșuat.";
  } catch {
    return "Cererea a eșuat.";
  }
};

export const searchProducts = async (
  q: string,
  options: SearchProductsOptions = {},
): Promise<ListProductsResponse> => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const params = new URLSearchParams({
    q: q.trim(),
    page: String(page),
    limit: String(limit),
  });

  const headers: HeadersInit = {};
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(apiUrl(`/products?${params.toString()}`), {
    method: "GET",
    headers,
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as ListProductsResponse;
};
