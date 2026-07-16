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
