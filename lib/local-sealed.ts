/**
 * Demo sealed inventory in localStorage.
 * Seeded from mock sealedProducts; opening removes products from the list.
 */

import {
  sealedProducts,
  type SealedProduct,
} from "@/lib/mock-data";

const STORAGE_KEY = "cardcap-sealed";
const EVENT = "cardcap-sealed-changed";

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function getLocalSealed(): SealedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // First visit only: seed from demo mock data
      const seed = sealedProducts.map((p) => ({ ...p }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as SealedProduct[];
    // Empty array is valid (user deleted everything) — never re-seed
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalSealed(items: SealedProduct[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notify();
}

/** Remove a sealed product row entirely (after opening). */
export function removeLocalSealed(id: string): SealedProduct[] {
  const next = getLocalSealed().filter((p) => p.id !== id);
  saveLocalSealed(next);
  return next;
}

/** Update fields on a local sealed row. */
export function updateLocalSealed(
  id: string,
  patch: Partial<
    Pick<
      SealedProduct,
      | "quantity"
      | "condition"
      | "purchasePrice"
      | "purchaseDate"
      | "marketValue"
    >
  >,
): SealedProduct[] {
  const items = getLocalSealed();
  const idx = items.findIndex((p) => p.id === id);
  if (idx < 0) return items;
  const next = [...items];
  next[idx] = { ...next[idx], ...patch };
  saveLocalSealed(next);
  return next;
}

/**
 * Open one unit of a sealed product.
 * quantity > 1 → decrement; quantity 1 → remove from list.
 */
export function openLocalSealedUnit(id: string): SealedProduct[] {
  const items = getLocalSealed();
  const idx = items.findIndex((p) => p.id === id);
  if (idx < 0) return items;
  const row = items[idx];
  if (row.quantity > 1) {
    const next = [...items];
    next[idx] = { ...row, quantity: row.quantity - 1 };
    saveLocalSealed(next);
    return next;
  }
  return removeLocalSealed(id);
}

export const SEALED_CHANGED_EVENT = EVENT;
