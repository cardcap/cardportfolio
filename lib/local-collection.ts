/**
 * Demo / offline collection in localStorage.
 * Used when the user is not authenticated so "Zur Sammlung hinzufügen"
 * still works and Assets → Karten shows the cards.
 */

import type { TcgCard } from "@/lib/pokemon-tcg";
import { getCardPrice, getCardImageUrl, getCardImageFallbacks } from "@/lib/pokemon-tcg";
import type { CardLanguage } from "@/lib/tcgdex-constants";

/** Per-copy condition + EK + Kaufdatum */
export type LocalExemplar = {
  condition: string;
  purchasePrice: number | null;
  purchaseDate?: string | null;
};

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
  /** Individual copies when prices/conditions differ per exemplar */
  exemplars?: LocalExemplar[];
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

export type AddToCollectionOptions = {
  language?: CardLanguage | string;
  condition?: string;
  quantity?: number;
  /** Override EK pro Stück (z. B. aus Sealed-Öffnung) */
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  /** Optional note stored in exemplars for multi-copy tracking */
  origin?: string | null;
};

/** Add or bump quantity for matching tcgCardId + condition */
export function addToLocalCollection(
  card: TcgCard,
  language: CardLanguage | string = "de",
  condition = "Near Mint",
  quantity = 1,
): LocalCollectionItem {
  return addToLocalCollectionDetailed(card, {
    language,
    condition,
    quantity,
  });
}

/**
 * Add card with optional EK / date (used when opening sealed products).
 * Each opened copy is tracked as exemplars with the allocated purchase price.
 */
export function addToLocalCollectionDetailed(
  card: TcgCard,
  opts: AddToCollectionOptions = {},
): LocalCollectionItem {
  const language = opts.language ?? "de";
  const condition = opts.condition ?? "Near Mint";
  const quantity = Math.max(1, opts.quantity ?? 1);
  const marketUnit = getCardPrice(card) ?? 0;
  const purchaseUnit =
    opts.purchasePrice !== undefined && opts.purchasePrice !== null
      ? opts.purchasePrice
      : marketUnit;
  const purchaseDate =
    opts.purchaseDate ?? new Date().toISOString().slice(0, 10);

  const items = getLocalCollection();
  const existing = items.find(
    (i) => i.tcgCardId === card.id && i.condition === condition,
  );

  const newExemplars: LocalExemplar[] = Array.from({ length: quantity }, () => ({
    condition,
    purchasePrice: purchaseUnit,
    purchaseDate,
  }));

  if (existing) {
    existing.quantity += quantity;
    const prevEx =
      existing.exemplars && existing.exemplars.length > 0
        ? existing.exemplars
        : Array.from({ length: Math.max(0, existing.quantity - quantity) }, () => ({
            condition: existing.condition,
            purchasePrice: existing.purchasePrice,
            purchaseDate: existing.purchaseDate,
          }));
    existing.exemplars = [...prevEx, ...newExemplars];
    // Weighted average EK across all exemplars
    const invested = existing.exemplars.reduce(
      (s, e) => s + (e.purchasePrice ?? 0),
      0,
    );
    existing.purchasePrice =
      existing.quantity > 0
        ? Math.round((invested / existing.quantity) * 100) / 100
        : purchaseUnit;
    existing.marketValue =
      Math.round(marketUnit * existing.quantity * 100) / 100;
    existing.profit =
      Math.round((existing.marketValue - invested) * 100) / 100;
    saveLocalCollection(items);
    return existing;
  }

  const created = collectionItemFromTcg(card, language, condition, quantity);
  created.purchasePrice = purchaseUnit;
  created.purchaseDate = purchaseDate;
  created.marketValue = Math.round(marketUnit * quantity * 100) / 100;
  created.profit =
    Math.round((created.marketValue - purchaseUnit * quantity) * 100) / 100;
  created.exemplars = newExemplars;
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

export function itemInvested(item: LocalCollectionItem): number {
  if (item.exemplars && item.exemplars.length > 0) {
    return item.exemplars.reduce((s, e) => s + (e.purchasePrice ?? 0), 0);
  }
  return (item.purchasePrice ?? 0) * item.quantity;
}

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

  // Date-only: keep per-exemplar condition/price, only rewrite dates
  const dateOnly =
    patch.purchaseDate !== undefined &&
    patch.quantity === undefined &&
    patch.condition === undefined &&
    patch.purchasePrice === undefined;

  if (dateOnly && item.exemplars && item.exemplars.length > 0) {
    item.exemplars = item.exemplars.map((e) => ({
      ...e,
      purchaseDate: patch.purchaseDate,
    }));
  } else if (
    patch.quantity !== undefined ||
    patch.condition !== undefined ||
    patch.purchasePrice !== undefined ||
    patch.purchaseDate !== undefined
  ) {
    // Keep exemplars in sync when simple uniform update
    item.exemplars = Array.from({ length: item.quantity }, () => ({
      condition: item.condition,
      purchasePrice: item.purchasePrice,
      purchaseDate: item.purchaseDate,
    }));
  }

  const invested = itemInvested(item);
  item.profit = Math.round((item.marketValue - invested) * 100) / 100;

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
  purchaseDate?: string | null;
};

function sumInvested(copies: CollectionCopyInput[]): number {
  return copies.reduce((s, c) => s + (c.purchasePrice ?? 0), 0);
}

/**
 * Replace one collection row with per-exemplar condition + EK.
 * Same condition → one row; individual prices kept in `exemplars`.
 * Summary purchasePrice = average EK; invested = sum of EKs via exemplars.
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

  // condition → copies for that condition
  const byCondition = new Map<string, CollectionCopyInput[]>();
  for (const copy of copies) {
    const c = (copy.condition || "Near Mint").trim() || "Near Mint";
    const list = byCondition.get(c) ?? [];
    list.push({
      condition: c,
      purchasePrice: copy.purchasePrice,
      purchaseDate: copy.purchaseDate ?? purchaseDate ?? orig.purchaseDate,
    });
    byCondition.set(c, list);
  }

  // Remove original; also drop other rows for same tcgCardId that we will rebuild
  // Only remove original id — other conditions of same card stay unless in this replace set
  let next = items.filter((i) => i.id !== id);
  const result: LocalCollectionItem[] = [];
  const date =
    purchaseDate !== undefined ? purchaseDate : orig.purchaseDate;

  const conditionKeys = [...byCondition.keys()];
  const onlyOneGroup = conditionKeys.length === 1;

  for (const [condition, groupCopies] of byCondition) {
    const quantity = groupCopies.length;
    const invested = sumInvested(groupCopies);
    const purchasePrice =
      Math.round((invested / Math.max(1, quantity)) * 100) / 100;
    const marketValue = Math.round(unitMarket * quantity * 100) / 100;
    const profit = Math.round((marketValue - invested) * 100) / 100;
    const exemplars: LocalExemplar[] = groupCopies.map((c) => ({
      condition: c.condition,
      purchasePrice: c.purchasePrice,
      purchaseDate: c.purchaseDate ?? date ?? null,
    }));
    // Row-level purchaseDate: first exemplar date or fallback
    const rowDate =
      exemplars.find((e) => e.purchaseDate)?.purchaseDate ?? date ?? null;

    // Prefer updating original id when single group (keeps selection stable)
    const reuseId = onlyOneGroup ? orig.id : uid();

    // If another row already has this condition, merge into it
    const existingIdx = next.findIndex(
      (i) =>
        i.tcgCardId === orig.tcgCardId &&
        i.condition === condition &&
        i.id !== reuseId,
    );

    if (existingIdx >= 0) {
      const existing = { ...next[existingIdx] };
      const prevExemplars =
        existing.exemplars && existing.exemplars.length === existing.quantity
          ? existing.exemplars
          : Array.from({ length: existing.quantity }, () => ({
              condition: existing.condition,
              purchasePrice: existing.purchasePrice,
              purchaseDate: existing.purchaseDate,
            }));
      const mergedExemplars = [...prevExemplars, ...exemplars];
      const newQty = mergedExemplars.length;
      const newInvested = sumInvested(mergedExemplars);
      const blended =
        Math.round((newInvested / Math.max(1, newQty)) * 100) / 100;
      existing.quantity = newQty;
      existing.purchasePrice = blended;
      existing.purchaseDate =
        mergedExemplars.find((e) => e.purchaseDate)?.purchaseDate ??
        date ??
        existing.purchaseDate;
      existing.marketValue = Math.round(unitMarket * newQty * 100) / 100;
      existing.profit =
        Math.round((existing.marketValue - newInvested) * 100) / 100;
      existing.exemplars = mergedExemplars;
      next[existingIdx] = existing;
      result.push(existing);
      continue;
    }

    const created: LocalCollectionItem = {
      ...orig,
      id: reuseId,
      condition,
      quantity,
      purchasePrice,
      purchaseDate: rowDate,
      marketValue,
      profit,
      exemplars,
    };
    next.unshift(created);
    result.push(created);
  }

  saveLocalCollection(next);
  return result;
}

/**
 * Remove all local rows for a tcgCardId (or explicit ids), then write copies
 * from a template item (name, images, …).
 */
export function replaceLocalCollectionForCard(
  template: LocalCollectionItem,
  copies: CollectionCopyInput[],
  options: {
    removeIds?: string[];
    purchaseDate?: string | null;
  } = {},
): LocalCollectionItem[] {
  const items = getLocalCollection();
  const removeSet = new Set(
    options.removeIds?.length
      ? options.removeIds
      : items
          .filter((i) => i.tcgCardId === template.tcgCardId)
          .map((i) => i.id),
  );
  // Keep unrelated cards
  let next = items.filter((i) => !removeSet.has(i.id));

  // Group copies by condition
  const byCondition = new Map<string, CollectionCopyInput[]>();
  for (const copy of copies) {
    const c = (copy.condition || "Near Mint").trim() || "Near Mint";
    const list = byCondition.get(c) ?? [];
    list.push({
      condition: c,
      purchasePrice: copy.purchasePrice,
      purchaseDate:
        copy.purchaseDate ?? options.purchaseDate ?? template.purchaseDate,
    });
    byCondition.set(c, list);
  }

  const unitMarket =
    template.quantity > 0 && template.marketValue
      ? template.marketValue / Math.max(1, template.quantity)
      : (template.purchasePrice ?? 0);
  // Prefer unit market from first removee if available
  const removed = items.find((i) => removeSet.has(i.id));
  const marketUnit =
    removed && removed.quantity > 0
      ? removed.marketValue / removed.quantity
      : unitMarket;

  const date =
    options.purchaseDate !== undefined
      ? options.purchaseDate
      : template.purchaseDate;
  const result: LocalCollectionItem[] = [];

  for (const [condition, groupCopies] of byCondition) {
    const quantity = groupCopies.length;
    const invested = sumInvested(groupCopies);
    const purchasePrice =
      Math.round((invested / Math.max(1, quantity)) * 100) / 100;
    const marketValue = Math.round(marketUnit * quantity * 100) / 100;
    const profit = Math.round((marketValue - invested) * 100) / 100;
    const exemplars: LocalExemplar[] = groupCopies.map((c) => ({
      condition: c.condition,
      purchasePrice: c.purchasePrice,
      purchaseDate: c.purchaseDate ?? date ?? null,
    }));
    const rowDate =
      exemplars.find((e) => e.purchaseDate)?.purchaseDate ?? date ?? null;
    const created: LocalCollectionItem = {
      ...template,
      id: uid(),
      condition,
      quantity,
      purchasePrice,
      purchaseDate: rowDate,
      marketValue,
      profit,
      exemplars,
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
  const invested = items.reduce((s, i) => s + itemInvested(i), 0);
  return {
    totalCards,
    uniqueCards,
    duplicates,
    totalValue: Math.round(totalValue * 100) / 100,
    invested: Math.round(invested * 100) / 100,
    profitLoss: Math.round((totalValue - invested) * 100) / 100,
  };
}
