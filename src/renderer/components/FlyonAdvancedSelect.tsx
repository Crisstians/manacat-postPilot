import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
}

interface FlyonAdvancedSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

export function FlyonAdvancedSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Selectează...",
  disabled = false,
  searchable = false,
  size = "sm",
  className = "",
}: FlyonAdvancedSelectProps) {
  const reactId = useId();
  const selectId = id ?? `flyon-select-${reactId.replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? placeholder;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const updateMenuPosition = () => {
    const toggle = toggleRef.current;
    if (!toggle) return;
    const rect = toggle.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!open) {
      setQuery("");
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu =
    open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            className="advance-select-menu opened fixed z-[200] flex max-h-60 flex-col overflow-hidden p-0 shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
            role="listbox"
            aria-labelledby={selectId}
          >
            {searchable ? (
              <div className="shrink-0 border-b border-base-300/60 bg-base-100 p-2">
                <input
                  type="search"
                  className="input input-xs w-full bg-base-100"
                  placeholder="Caută..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-base-100 p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value || "__empty"}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`advance-select-option block w-full text-left ${
                        isSelected ? "selected select-active" : ""
                      }`}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate">{option.label}</span>
                        {isSelected ? <span className="shrink-0 text-primary">✓</span> : null}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="helper-text px-3 py-2.5">Niciun rezultat</p>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={rootRef} className={`advance-select relative w-full ${className}`}>
        <button
          ref={toggleRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => {
            if (disabled) return;
            setOpen((current) => !current);
          }}
          className={`advance-select-toggle advance-select-${size} w-full text-left ${
            open ? "active" : ""
          }`}
        >
          <span className={`block truncate pe-6 ${value ? "text-base-content" : "text-base-content/50"}`}>
            {selectedLabel}
          </span>
          <ChevronDown
            size={14}
            className={`pointer-events-none absolute top-1/2 end-3 -translate-y-1/2 text-base-content/45 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
      {menu}
    </>
  );
}
