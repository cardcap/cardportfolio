import "server-only";

import fs from "fs";
import path from "path";

type SetCodeEntry = {
  code: string;
  printedTotal: number | null;
};

type SetCodesFile = {
  updatedAt: string;
  codes: Record<string, SetCodeEntry>;
};

let cachedCodes: Record<string, SetCodeEntry> | null = null;

function loadSetCodes(): Record<string, SetCodeEntry> {
  if (cachedCodes) return cachedCodes;

  const filePath = path.join(process.cwd(), "data", "set-codes.json");
  try {
    if (!fs.existsSync(filePath)) {
      cachedCodes = {};
      return cachedCodes;
    }
    const file = JSON.parse(fs.readFileSync(filePath, "utf-8")) as SetCodesFile;
    cachedCodes = file.codes ?? {};
    return cachedCodes;
  } catch {
    cachedCodes = {};
    return cachedCodes;
  }
}

/** TCGdex ids (sv07) → set-codes keys (sv7) and common aliases */
function setCodeLookupKeys(setId: string): string[] {
  const id = setId.trim();
  const keys = [id];
  // sv07 → sv7, sv03.5 → sv3pt5, me02.5 → me2pt5
  const m = id.match(/^(sv|me|swsh)0*(\d+)(?:\.(\d+))?$/i);
  if (m) {
    const serie = m[1].toLowerCase();
    const n = m[2];
    const frac = m[3];
    if (frac) {
      keys.push(`${serie}${n}pt${frac}`);
      keys.push(`${serie}${n}.${frac}`);
    } else {
      keys.push(`${serie}${n}`);
      if (n.length === 1) keys.push(`${serie}0${n}`);
    }
  }
  return keys;
}

function resolveSetCodeEntry(setId: string): SetCodeEntry | undefined {
  const codes = loadSetCodes();
  for (const key of setCodeLookupKeys(setId)) {
    if (codes[key]) return codes[key];
  }
  return undefined;
}

export function getSetCollectorCode(setId: string): string {
  const entry = resolveSetCodeEntry(setId);
  return entry?.code ?? setId.toUpperCase();
}

export function getSetPrintedTotal(setId: string): number | null {
  const entry = resolveSetCodeEntry(setId);
  return entry?.printedTotal ?? null;
}

export function formatCardNumber(localId: string): string {
  const trimmed = localId.trim();
  if (/^\d+$/.test(trimmed)) {
    return String(parseInt(trimmed, 10));
  }
  return trimmed;
}

export function formatCollectorCardId(
  setId: string,
  localId: string,
  officialTotal?: number | null,
): string {
  const code = getSetCollectorCode(setId);
  const number = formatCardNumber(localId);
  const entry = loadSetCodes()[setId];
  const total =
    officialTotal ??
    entry?.printedTotal ??
    null;

  return total != null ? `${code} ${number}/${total}` : `${code} ${number}`;
}