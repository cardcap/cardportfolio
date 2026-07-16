/**
 * Demo / offline collection in localStorage.
 * Used when the user is not authenticated so "Zur Sammlung hinzufügen"
 * still works and Assets → Karten shows the cards.
 */

import type { TcgCard } from "@/lib/pokemon-tcg";
import { getCardPrice, getCardImageUrl, getCardImageFallbacks } from "@/lib/pokemon-tcg";
import type { CardLanguage } from "@/lib/tcgdex-constants";

export type LocalCollectionItem = {
  id: string;
  tcgCardId: string;
  name: string;
  setId: string;
  setName: string;
  number: string;
  imageUrl: string;
  imageFallbacks: string[];
  rarity: string | null;
  language: string;
  condition: string;
  quantity: number;
  purchasePrice: number | null;
  purchaseDate: string | null;
  marketValue: number;
  profit: number | null;
  types?: string[];
  category?: string;
};

const STORAGE_KEY = "cardcap-collection";

function uid() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getLocalCollection(): LocalCollectionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalCollectionItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCollection(items: LocalCollectionItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cardcap-collection-changed"));
}

export function getLocalCollectionIds(): Set<string> {
  return new Set(getLocalCollection().map((i) => i.tcgCardId));
}

export function collectionItemFromTcg(
  card: TcgCard,
  language: CardLanguage | string = "de",
  condition = "Near Mint",
  quantity = 1,
): LocalCollectionItem {
  const price = getCardPrice(card);
  return {
    id: uid(),
    tcgCardId: card.id,
    name: card.name,
    setId: card.set?.id ?? "",
    setName: card.set?.name ?? "",
    number: card.collectorId ?? card.number ?? "",
    imageUrl: getCardImageUrl(card),
    imageFallbacks: getCardImageFallbacks(card),
    rarity: card.rarity ?? null,
    language,
    condition,
    quantity,
    purchasePrice: price,
    purchaseDate: new Date().toISOString().slice(0, 10),
    marketValue: price ?? 0,
    profit: 0,
    types: card.types,
    category: card.category,
  };
}

/** Add or bump quantity for matching tcgCardId + condition */
export function addToLocalCollection(
  card: TcgCard,
  language: CardLanguage | string = "de",
  condition = "Near Mint",
  quantity = 1,
): LocalCollectionItem {
  const items = getLocalCollection();
  const existing = items.find(
    (i) => i.tcgCardId === card.id && i.condition === condition,
  );
  if (existing) {
    existing.quantity += quantity;
    const unit = existing.purchasePrice ?? getCardPrice(card) ?? 0;
    existing.marketValue = Math.round(unit * existing.quantity * 100) / 100;
    saveLocalCollection(items);
    return existing;
  }
  const created = collectionItemFromTcg(card, language, condition, quantity);
  items.unshift(created);
  saveLocalCollection(items);
  return created;
}

export type LocalCollectionUpdate = {
  quantity?: number;
  condition?: string;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
};

/** Update a local collection row by id. Recalculates marketValue/profit. */
export function updateLocalCollectionItem(
  id: string,
  patch: LocalCollectionUpdate,
): LocalCollectionItem | null {
  const items = getLocalCollection();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;

  const item = { ...items[idx] };
  if (patch.quantity !== undefined) {
    item.quantity = Math.max(1, Math.floor(patch.quantity));
  }
  if (patch.condition !== undefined && patch.condition.trim()) {
    item.condition = patch.condition.trim();
  }
  if (patch.purchasePrice !== undefined) {
    item.purchasePrice = patch.purchasePrice;
  }
  if (patch.purchaseDate !== undefined) {
    item.purchaseDate = patch.purchaseDate;
  }

  const unit = item.purchasePrice ?? item.marketValue / Math.max(1, item.quantity);
  // Keep unit market from prior marketValue/qty if no purchase price
  const unitMarket =
    item.quantity > 0
      ? (items[idx].marketValue || 0) / Math.max(1, items[idx].quantity)
      : 0;
  const marketUnit = unitMarket > 0 ? unitMarket : unit;
  item.marketValue = Math.round(marketUnit * item.quantity * 100) / 100;
  if (item.purchasePrice != null) {
    item.profit =
      Math.round((item.marketValue - item.purchasePrice * item.quantity) * 100) /
      100;
  }

  items[idx] = item;
  saveLocalCollection(items);
  return item;
}

export function removeLocalCollectionItem(id: string): boolean {
  const items = getLocalCollection();
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return false;
  saveLocalCollection(next);
  return true;
}

export type CollectionCopyInput = {
  condition: string;
  purchasePrice: number | null;
};

/**
 * Replace one collection row with per-exemplar condition + EK.
 * Same condition is merged; EK is quantity-weighted average when prices differ.
 */
export function replaceLocalCollectionByCopies(
  id: string,
  copies: CollectionCopyInput[],
  purchaseDate?: string | null,
): LocalCollectionItem[] {
  const items = getLocalCollection();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0 || copies.length === 0) return items;

  const orig = items[idx];
  const unitMarket =
    orig.quantity > 0
      ? (orig.marketValue || 0) / Math.max(1, orig.quantity)
      : (orig.purchasePrice ?? 0);

  // condition → list of EKs
  const byCondition = new Map<string, number[]>();
  for (const copy of copies) {
    const c = (copy.condition || "Near Mint").trim() || "Near Mint";
    const list = byCondition.get(c) ?? [];
    list.push(copy.purchasePrice ?? 0);
    byCondition.set(c, list);
  }

  let next = items.filter((i) => i.id !== id);
  const result: LocalCollectionItem[] = [];
  const date =
    purchaseDate !== undefined ? purchaseDate : orig.purchaseDate;

  for (const [condition, prices] of byCondition) {
    const quantity = prices.length;
    const sum = prices.reduce((s, p) => s + p, 0);
    const purchasePrice =
      Math.round((sum / Math.max(1, quantity)) * 100) / 100;

    const existingIdx = next.findIndex(
      (i) => i.tcgCardId === orig.tcgCardId && i.condition === condition,
    );

    if (existingIdx >= 0) {
      const existing = { ...next[existingIdx] };
      const prevQty = existing.quantity;
      const prevUnit = existing.purchasePrice ?? 0;
      const newQty = prevQty + quantity;
      const blended =
        Math.round(
          ((prevUnit * prevQty + purchasePrice * quantity) / newQty) * 100,
        ) / 100;
      existing.quantity = newQty;
      existing.purchasePrice = blended;
      existing.purchaseDate = date ?? existing.purchaseDate;
      existing.marketValue =
        Math.round(unitMarket * existing.quantity * 100) / 100;
      existing.profit =
        Math.round(
          (existing.marketValue - blended * existing.quantity) * 100,
        ) / 100;
      next[existingIdx] = existing;
      result.push(existing);
      continue;
    }

    const created: LocalCollectionItem = {
      ...orig,
      id: uid(),
      condition,
      quantity,
      purchasePrice,
      purchaseDate: date ?? null,
      marketValue: Math.round(unitMarket * quantity * 100) / 100,
      profit:
        Math.round((unitMarket * quantity - purchasePrice * quantity) * 100) /
        100,
    };
    next.unshift(created);
    result.push(created);
  }

  saveLocalCollection(next);
  return result;
}

/** @deprecated use replaceLocalCollectionByCopies */
export function replaceLocalCollectionByConditions(
  id: string,
  conditions: string[],
  patch: {
    purchasePrice?: number | null;
    purchaseDate?: string | null;
  } = {},
): LocalCollectionItem[] {
  return replaceLocalCollectionByCopies(
    id,
    conditions.map((condition) => ({
      condition,
      purchasePrice:
        patch.purchasePrice !== undefined ? patch.purchasePrice : null,
    })),
    patch.purchaseDate,
  );
}

export function localCollectionMetrics(items: LocalCollectionItem[]) {
  const totalCards = items.reduce((s, i) => s + i.quantity, 0);
  const uniqueCards = new Set(items.map((i) => i.tcgCardId)).size;
  const duplicates = Math.max(0, totalCards - uniqueCards);
  const totalValue = items.reduce((s, i) => s + (i.marketValue ?? 0), 0);
  const invested = items.reduce(
    (s, i) => s + (i.purchasePrice ?? 0) * i.quantity,
    0,
  );
  return {
    totalCards,
    uniqueCards,
    duplicates,
    totalValue: Math.round(totalValue * 100) / 100,
    invested: Math.round(invested * 100) / 100,
    profitLoss: Math.round((totalValue - invested) * 100) / 100,
  };
}
