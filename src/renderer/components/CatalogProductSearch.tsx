import { Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { searchProducts, type CatalogProduct } from "../../services/productsApi";
import { catalogDisplayName, catalogPrimaryImage } from "../../shared/catalogProductMap";

interface CatalogProductSearchProps {
  onSelect: (product: CatalogProduct) => void;
}

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 20;

export const shouldTriggerCatalogSearch = (query: string): boolean => {
  const trimmed = query.trim();
  if (!trimmed) return false;
  if (/^\d+$/.test(trimmed)) return trimmed.length >= 1;
  return trimmed.length >= 2;
};

const formatPrice = (price: number): string => {
  if (!Number.isFinite(price) || price <= 0) return "—";
  return `${price.toFixed(2)} lei`;
};

export function CatalogProductSearch({ onSelect }: CatalogProductSearchProps) {
  const { accessToken } = useAuth();
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const close = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setOpen(false);
    setQuery("");
    setItems([]);
    setError(null);
    setLoading(false);
    setSearched(false);
  };

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (!shouldTriggerCatalogSearch(query)) {
      abortRef.current?.abort();
      abortRef.current = null;
      setItems([]);
      setError(null);
      setLoading(false);
      setSearched(false);
      return;
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      void searchProducts(query, {
        limit: RESULT_LIMIT,
        accessToken,
        signal: controller.signal,
      })
        .then((result) => {
          if (controller.signal.aborted) return;
          setItems(result.items);
          setSearched(true);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          const message = err instanceof Error ? err.message : "Căutarea a eșuat.";
          setError(message);
          setItems([]);
          setSearched(true);
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query, open, accessToken]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSelect = (product: CatalogProduct) => {
    onSelect(product);
    close();
  };

  return (
    <div className="relative">
      {!open ? (
        <button
          type="button"
          className="btn btn-sm btn-soft btn-primary w-full gap-1.5"
          onClick={() => setOpen(true)}
        >
          <Search size={14} aria-hidden />
          Caută în catalog
        </button>
      ) : (
        <div
          id={panelId}
          className="space-y-2 rounded-lg border border-base-300/80 bg-base-100 p-2"
          role="search"
        >
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-base-content/40"
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                className="input input-sm w-full pl-8"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cod, SKU, nume sau nume alternativ…"
                aria-label="Caută produs în catalog"
                aria-controls={`${panelId}-results`}
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              className="btn btn-sm btn-ghost btn-square shrink-0"
              onClick={close}
              aria-label="Închide căutarea"
            >
              <X size={14} />
            </button>
          </div>

          <div id={`${panelId}-results`} className="max-h-56 overflow-y-auto" role="listbox">
            {loading ? (
              <p className="flex items-center gap-2 px-2 py-3 text-xs text-base-content/55">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                Se caută…
              </p>
            ) : null}

            {!loading && error ? (
              <p className="px-2 py-3 text-xs text-error">{error}</p>
            ) : null}

            {!loading && !error && !shouldTriggerCatalogSearch(query) ? (
              <p className="px-2 py-3 text-xs text-base-content/50">
                Tastează cod, SKU sau cel puțin 2 litere din nume.
              </p>
            ) : null}

            {!loading && !error && searched && items.length === 0 ? (
              <p className="px-2 py-3 text-xs text-base-content/50">Niciun produs găsit.</p>
            ) : null}

            {!loading && !error && items.length > 0 ? (
              <ul className="divide-y divide-base-300/50">
                {items.map((item) => {
                  const title = catalogDisplayName(item) || `Produs #${item.productId}`;
                  const thumb = catalogPrimaryImage(item);
                  const meta = [item.sku ? `SKU ${item.sku}` : null, `#${item.productId}`]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <li key={item.productId}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full items-center gap-2 px-2 py-2 text-left transition hover:bg-base-200/60"
                        onClick={() => handleSelect(item)}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-base-200">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-[10px] text-base-content/35">N/A</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">{title}</span>
                          <span className="block truncate text-[10px] text-base-content/50">
                            {meta}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-base-content/70">
                          {formatPrice(item.price)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
