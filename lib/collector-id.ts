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

export function getSetCollectorCode(setId: string): string {
  const entry = loadSetCodes()[setId];
  return entry?.code ?? setId.toUpperCase();
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