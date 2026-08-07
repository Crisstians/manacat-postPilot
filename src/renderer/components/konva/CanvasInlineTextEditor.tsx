import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  type SyntheticEvent,
} from "react";
import { GARET_FONT } from "./textStyles";

export type InlineEditableField = "productName" | "subtitle" | "description" | "price";

export interface InlineTextEditSession {
  field: InlineEditableField;
  /** Coordonate în unități de template (înainte de previewScale). */
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  multiline: boolean;
  maxLength?: number;
}

export interface CanvasInlineTextEditorHandle {
  commit: () => void;
  cancel: () => void;
}

interface CanvasInlineTextEditorProps {
  session: InlineTextEditSession;
  previewScale: number;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

export const CanvasInlineTextEditor = forwardRef<
  CanvasInlineTextEditorHandle,
  CanvasInlineTextEditorProps
>(function CanvasInlineTextEditor({ session, previewScale, onCommit, onCancel }, ref) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    committedRef.current = false;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [session.field, session.x, session.y]);

  const finish = (value: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(value);
  };

  const cancel = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCancel();
  };

  useImperativeHandle(ref, () => ({
    commit: () => finish(inputRef.current?.value ?? session.value),
    cancel,
  }));

  const sharedStyle: CSSProperties = {
    position: "absolute",
    left: session.x * previewScale,
    top: session.y * previewScale,
    width: Math.max(24, session.width * previewScale),
    height: Math.max(24, session.height * previewScale),
    margin: 0,
    padding: "0 2px",
    border: "2px solid #fb923c",
    borderRadius: 4,
    outline: "none",
    background: "rgba(15, 23, 42, 0.72)",
    color: session.fill,
    fontFamily: GARET_FONT,
    fontSize: Math.max(12, session.fontSize * previewScale),
    fontWeight: session.fontWeight,
    lineHeight: 1.15,
    caretColor: session.fill,
    boxSizing: "border-box",
    resize: "none",
    overflow: "auto",
    userSelect: "text",
    WebkitUserSelect: "text",
    zIndex: 20,
  };

  const stopPreviewGestures = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === "Enter") {
      if (session.multiline && !event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      finish(event.currentTarget.value);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    finish(event.currentTarget.value);
  };

  if (session.multiline) {
    return (
      <textarea
        ref={inputRef as RefObject<HTMLTextAreaElement>}
        defaultValue={session.value}
        maxLength={session.maxLength}
        spellCheck={false}
        aria-label="Editează text pe canvas"
        onMouseDown={stopPreviewGestures}
        onClick={stopPreviewGestures}
        onDoubleClick={stopPreviewGestures}
        onPointerDown={stopPreviewGestures}
        onWheel={stopPreviewGestures}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={{
          ...sharedStyle,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      />
    );
  }

  return (
    <input
      ref={inputRef as RefObject<HTMLInputElement>}
      type="text"
      inputMode={session.field === "price" ? "decimal" : "text"}
      defaultValue={session.value}
      maxLength={session.maxLength}
      spellCheck={false}
      aria-label="Editează text pe canvas"
      onMouseDown={stopPreviewGestures}
      onClick={stopPreviewGestures}
      onDoubleClick={stopPreviewGestures}
      onPointerDown={stopPreviewGestures}
      onWheel={stopPreviewGestures}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        ...sharedStyle,
        whiteSpace: "nowrap",
      }}
    />
  );
});

/** Parsează prețul din input (acceptă virgulă sau punct). */
export const parseInlinePrice = (raw: string, max: number): number => {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return 0;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, max);
};
