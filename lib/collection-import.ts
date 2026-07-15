import "server-only";

import * as XLSX from "xlsx";
import {
  DEFAULT_LANGUAGE,
  isCardLanguage,
  type CardLanguage,
} from "@/lib/tcgdex-constants";
import {
  buildCardIndex,
  matchImportRow,
  type CardIndex,
  type MatchResult,
  type ParsedImportRow,
} from "@/lib/collection-matcher";

export type { ParsedImportRow };

export type ImportPreviewRow = ParsedImportRow &
  MatchResult & {
    include: boolean;
  };

export type ImportPreviewResult = {
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    matched: number;
    uncertain: number;
    notFound: number;
  };
};

const MAX_ROWS = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const FIELD_ALIASES: Record<keyof Omit<ParsedImportRow, "rowIndex">, string[]> =
  {
    name: [
      "name",
      "kartenname",
      "card name",
      "card",
      "pokemon",
      "karte",
      "cardname",
      "pokémon",
    ],
    set: ["set", "setname", "set name", "expansion", "serie", "set-name"],
    number: [
      "number",
      "nummer",
      "kartennummer",
      "card number",
      "nr",
      "#",
      "no",
      "localid",
    ],
    language: ["language", "sprache", "lang", "locale"],
    quantity: ["quantity", "anzahl", "qty", "count", "stück", "stuck"],
    condition: ["condition", "zustand", "grade", "grading"],
    purchasePrice: [
      "purchaseprice",
      "einkaufspreis",
      "ek",
      "purchase price",
      "buy price",
      "preis",
      "cost",
    ],
    purchaseDate: [
      "purchasedate",
      "kaufdatum",
      "purchase date",
      "buy date",
      "datum",
      "date",
    ],
    tcgCardId: [
      "tcgcardid",
      "tcgdex-id",
      "tcgdex id",
      "tcg id",
      "card id",
      "id",
      "tcgdx id",
    ],
  };

const CONDITION_ALIASES: Record<string, string> = {
  "near mint": "Near Mint",
  nearmint: "Near Mint",
  nm: "Near Mint",
  mint: "Mint",
  m: "Mint",
  excellent: "Excellent",
  ex: "Excellent",
  exzellent: "Excellent",
  good: "Good",
  gd: "Good",
  gut: "Good",
  played: "Played",
  lp: "Played",
  mp: "Played",
  lightlyplayed: "Played",
  "lightly played": "Played",
};

const LANGUAGE_ALIASES: Record<string, CardLanguage> = {
  de: "de",
  deutsch: "de",
  german: "de",
  en: "en",
  english: "en",
  englisch: "en",
  fr: "fr",
  french: "fr",
  französisch: "fr",
  es: "es",
  spanish: "es",
  spanisch: "es",
  it: "it",
  italian: "it",
  italienisch: "it",
  ja: "ja",
  japanese: "ja",
  japanisch: "ja",
};

export const IMPORT_TEMPLATE_CSV = `Name,Set,Kartennummer,Sprache,Anzahl,Zustand,Einkaufspreis,Kaufdatum
Bisaflor EX,XY,1,de,1,Near Mint,12.50,2025-03-01
`;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9#]+/g, "");
}

function detectDelimiter(line: string): string {
  const commas = (line.match(/,/g) ?? []).length;
  const semicolons = (line.match(/;/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  if (semicolons > commas && semicolons >= tabs) return ";";
  if (tabs > commas) return "\t";
  return ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text: string): string[][] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseCsvLine(line, delimiter));
}

function sheetToMatrix(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return rows.map((row) =>
    row.map((cell) => String(cell ?? "").trim()).filter((_, idx, arr) => {
      return idx < arr.length;
    }),
  );
}

function buildColumnMap(headers: string[]): Partial<Record<keyof ParsedImportRow, number>> {
  const map: Partial<Record<keyof ParsedImportRow, number>> = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<
    [keyof Omit<ParsedImportRow, "rowIndex">, string[]]
  >) {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.includes(header),
    );
    if (index >= 0) {
      map[field] = index;
    }
  }

  return map;
}

function cellValue(row: string[], index: number | undefined): string {
  if (index == null || index < 0) return "";
  return String(row[index] ?? "").trim();
}

function parseNumber(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseQuantity(value: string): number {
  const parsed = parseNumber(value);
  if (parsed == null || parsed < 1) return 1;
  return Math.floor(parsed);
}

function parseCondition(value: string): string {
  const key = value.trim().toLowerCase();
  if (!key) return "Near Mint";
  return CONDITION_ALIASES[key] ?? value.trim();
}

function parseLanguage(value: string): CardLanguage {
  const key = value.trim().toLowerCase();
  if (!key) return DEFAULT_LANGUAGE;
  const mapped = LANGUAGE_ALIASES[key];
  if (mapped) return mapped;
  return isCardLanguage(key) ? key : DEFAULT_LANGUAGE;
}

function matrixToRows(matrix: string[][]): ParsedImportRow[] {
  if (matrix.length < 2) return [];

  const headers = matrix[0];
  const columnMap = buildColumnMap(headers);
  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < matrix.length && rows.length < MAX_ROWS; i++) {
    const line = matrix[i];
    if (line.every((cell) => !cell)) continue;

    const name = cellValue(line, columnMap.name);
    const set = cellValue(line, columnMap.set);
    const number = cellValue(line, columnMap.number);
    const tcgCardId = cellValue(line, columnMap.tcgCardId);

    if (!name && !tcgCardId && !number) continue;

    rows.push({
      rowIndex: i + 1,
      name,
      set,
      number,
      language: parseLanguage(cellValue(line, columnMap.language)),
      quantity: parseQuantity(cellValue(line, columnMap.quantity)),
      condition: parseCondition(cellValue(line, columnMap.condition)),
      purchasePrice: parseNumber(cellValue(line, columnMap.purchasePrice)),
      purchaseDate: cellValue(line, columnMap.purchaseDate),
      tcgCardId,
    });
  }

  return rows;
}

export function parseImportBuffer(
  buffer: Buffer,
  filename: string,
): ParsedImportRow[] {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("Datei ist zu groß (max. 5 MB).");
  }

  const lower = filename.toLowerCase();
  const matrix =
    lower.endsWith(".xlsx") || lower.endsWith(".xls")
      ? sheetToMatrix(buffer)
      : parseCsvText(buffer.toString("utf-8"));

  const rows = matrixToRows(matrix);
  if (rows.length === 0) {
    throw new Error(
      "Keine importierbaren Zeilen gefunden. Prüfe Spaltenüberschriften oder lade die Vorlage herunter.",
    );
  }

  return rows;
}

export function convertGoogleSheetsUrl(url: string): string {
  const trimmed = url.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return trimmed;

  const gidMatch = trimmed.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? `&gid=${gidMatch[1]}` : "";
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv${gid}`;
}

export async function fetchImportSource(url: string): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  const exportUrl = convertGoogleSheetsUrl(url);
  const res = await fetch(exportUrl, {
    headers: { Accept: "text/csv,text/plain,application/octet-stream" },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(
      "Link konnte nicht geladen werden. Ist die Datei öffentlich zugänglich?",
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("Datei ist zu groß (max. 5 MB).");
  }

  const filename = contentType.includes("spreadsheet") ? "import.xlsx" : "import.csv";
  return { buffer, filename };
}

export function buildImportPreview(
  parsedRows: ParsedImportRow[],
  indexes: Map<CardLanguage, CardIndex>,
): ImportPreviewResult {
  const rows: ImportPreviewRow[] = parsedRows.map((row) => {
    const index = indexes.get(row.language) ?? indexes.get(DEFAULT_LANGUAGE)!;
    const match = matchImportRow(row, index);

    return {
      ...row,
      ...match,
      include: match.status !== "not_found",
    };
  });

  return {
    rows,
    summary: {
      total: rows.length,
      matched: rows.filter((row) => row.status === "matched").length,
      uncertain: rows.filter((row) => row.status === "uncertain").length,
      notFound: rows.filter((row) => row.status === "not_found").length,
    },
  };
}

export function loadImportIndexes(
  langs: Iterable<CardLanguage>,
): Map<CardLanguage, CardIndex> {
  const indexes = new Map<CardLanguage, CardIndex>();
  for (const lang of langs) {
    indexes.set(lang, buildCardIndex(lang));
  }
  return indexes;
}