import {
  DRAFT_STORAGE_VERSION,
  normalizeWorkSession,
  parseWorkSession,
  type WorkSessionSnapshot,
} from "./draftStorage";

export const PMAN_FORMAT = "pman" as const;
export const PMAN_DOCUMENT_VERSION = 1 as const;
export const PMAN_POST_TYPE = "product" as const;

export interface PmanDocument {
  format: typeof PMAN_FORMAT;
  version: typeof PMAN_DOCUMENT_VERSION;
  postType: typeof PMAN_POST_TYPE;
  savedAt: string;
  activeIndex: number;
  activePanel: WorkSessionSnapshot["activePanel"];
  bulkCaption: string;
  bulkCaptionTouched: boolean;
  drafts: WorkSessionSnapshot["drafts"];
}

export type PmanParseResult =
  | { ok: true; document: PmanDocument; session: WorkSessionSnapshot }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const buildPmanDocument = (
  snapshot: Omit<WorkSessionSnapshot, "version"> | WorkSessionSnapshot,
): PmanDocument => ({
  format: PMAN_FORMAT,
  version: PMAN_DOCUMENT_VERSION,
  postType: PMAN_POST_TYPE,
  savedAt: snapshot.savedAt || new Date().toISOString(),
  activeIndex: snapshot.activeIndex,
  activePanel: snapshot.activePanel,
  bulkCaption: snapshot.bulkCaption,
  bulkCaptionTouched: snapshot.bulkCaptionTouched,
  drafts: snapshot.drafts,
});

export const serializePmanDocument = (
  snapshot: Omit<WorkSessionSnapshot, "version"> | WorkSessionSnapshot,
): string => JSON.stringify(buildPmanDocument(snapshot));

export const parsePmanDocument = (raw: string | null | undefined): PmanParseResult => {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "Fișierul .pman este gol." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Fișierul .pman nu este un JSON valid." };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: "Format .pman invalid." };
  }

  if (parsed.format !== PMAN_FORMAT) {
    return { ok: false, error: "Fișierul nu este un document PostPilot (.pman)." };
  }

  if (parsed.version !== PMAN_DOCUMENT_VERSION) {
    return { ok: false, error: `Versiune .pman nesuportată (${String(parsed.version)}).` };
  }

  if (parsed.postType !== PMAN_POST_TYPE) {
    return {
      ok: false,
      error: "Acest document .pman nu este o postare de produs.",
    };
  }

  const sessionRaw = JSON.stringify({
    version: DRAFT_STORAGE_VERSION,
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    activeIndex: parsed.activeIndex,
    activePanel: parsed.activePanel,
    bulkCaption: parsed.bulkCaption,
    bulkCaptionTouched: parsed.bulkCaptionTouched,
    drafts: parsed.drafts,
  });

  const session = parseWorkSession(sessionRaw);
  if (!session) {
    return { ok: false, error: "Conținutul documentului .pman este corupt sau incomplet." };
  }

  const normalized = normalizeWorkSession(session, "");
  const document = buildPmanDocument(normalized);
  return { ok: true, document, session: normalized };
};

export const documentDisplayName = (filePath: string | null): string => {
  if (!filePath) return "Document nou";
  const base = filePath.replace(/^.*[/\\]/, "");
  return base || "Document nou";
};

export const formatWindowTitle = (filePath: string | null, dirty: boolean): string => {
  const name = documentDisplayName(filePath);
  const dirtyMark = dirty ? "*" : "";
  return `${name}${dirtyMark} - Manacat PostPilot`;
};
