/**
 * Client-side transaction ledger (localStorage).
 * Shared by Portfolio → Transaktionen and Assets → Karten/Sealed sell flows.
 */

export type RecordedTxKind = "Kauf" | "Verkauf";
export type RecordedAssetType = "Karte" | "Sealed";

export type RecordedTransaction = {
  id: string;
  dateIso: string;
  dateLabel: string;
  type: RecordedTxKind;
  cardId: string;
  name: string;
  assetType: RecordedAssetType;
  setName: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  total: number;
  realizedProfit: number | null;
  note: string;
  source?: string;
  imageUrl?: string;
  imageFallbacks?: string[];
  createdAt: number;
};

export type RecordTransactionInput = {
  type: RecordedTxKind;
  positionId: string;
  positionLabel: string;
  kind: RecordedAssetType;
  date: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  source?: string;
  note?: string;
  setName?: string;
  imageUrl?: string;
  imageFallbacks?: string[];
  /** Cost basis used for realized P/L on Verkauf */
  costBasisTotal?: number | null;
};

const STORAGE_KEY = "cardcap-transactions";
export const TRANSACTIONS_CHANGED_EVENT = "cardcap-transactions-changed";

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT));
}

function uid() {
  return `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function dateLabelFromIso(dateIso: string): string {
  const [y, mo, d] = dateIso.split("-");
  if (y && mo && d) return `${d}.${mo}.${y}`;
  try {
    return new Date(dateIso).toLocaleDateString("de-DE");
  } catch {
    return dateIso;
  }
}

function displayNameFromLabel(label: string): string {
  return label
    .replace(/\s*\([^)]+\)\s*$/, "")
    .replace(/\s*·\s*[A-Z0-9][A-Z0-9\s/.-]*$/i, "")
    .trim() || label;
}

export function getLocalTransactions(): RecordedTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecordedTransaction[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t.id === "string" && t.dateIso)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch {
    return [];
  }
}

export function saveLocalTransactions(items: RecordedTransaction[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notify();
}

/** Append a transaction and return the full list. */
export function addLocalTransaction(
  input: RecordTransactionInput,
): RecordedTransaction {
  const total =
    Math.round(
      (input.pricePerUnit * input.quantity + (input.fees || 0)) * 100,
    ) / 100;

  let realizedProfit: number | null = null;
  if (input.type === "Verkauf") {
    const proceeds = input.pricePerUnit * input.quantity - (input.fees || 0);
    const cost = input.costBasisTotal ?? 0;
    realizedProfit = Math.round((proceeds - cost) * 100) / 100;
  }

  const tx: RecordedTransaction = {
    id: uid(),
    dateIso: input.date,
    dateLabel: dateLabelFromIso(input.date),
    type: input.type,
    cardId: input.positionId,
    name: displayNameFromLabel(input.positionLabel),
    assetType: input.kind,
    setName: input.setName?.trim() || "—",
    quantity: Math.max(1, input.quantity),
    pricePerUnit: input.pricePerUnit,
    fees: input.fees || 0,
    total,
    realizedProfit,
    note: (input.note || input.source || "").trim(),
    source: input.source,
    imageUrl: input.imageUrl,
    imageFallbacks: input.imageFallbacks,
    createdAt: Date.now(),
  };

  const next = [tx, ...getLocalTransactions()];
  saveLocalTransactions(next);
  return tx;
}

export function clearLocalTransactions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  notify();
}
