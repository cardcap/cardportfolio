/**
 * Apply a sale against Assets inventory (Karten or Sealed).
 * Decrements quantity or removes the row when qty reaches 0.
 */

import {
  getLocalCollection,
  removeLocalCollectionItem,
  updateLocalCollectionItem,
} from "@/lib/local-collection";
import {
  getLocalSealed,
  removeLocalSealed,
  updateLocalSealed,
  SEALED_CHANGED_EVENT,
} from "@/lib/local-sealed";
import {
  invalidateCollectionCache,
  invalidateSealedCache,
} from "@/lib/assets-client-cache";

export type SaleTarget = {
  id: string;
  kind: "Karte" | "Sealed";
  /** Units currently held */
  availableQty: number;
};

export async function applyAssetSale(
  target: SaleTarget,
  sellQty: number,
  isAuthenticated: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const qty = Math.max(1, Math.floor(sellQty) || 1);
  const available = Math.max(0, Math.floor(target.availableQty) || 0);
  if (available <= 0) {
    return { ok: false, error: "Keine Einheiten mehr im Bestand." };
  }
  const take = Math.min(qty, available);

  try {
    if (target.kind === "Karte") {
      if (isAuthenticated) {
        if (take >= available) {
          const res = await fetch("/api/collection", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: target.id }),
          });
          if (!res.ok) {
            return { ok: false, error: "Karte konnte nicht entfernt werden." };
          }
        } else {
          const res = await fetch("/api/collection", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: target.id,
              quantity: available - take,
            }),
          });
          if (!res.ok) {
            return { ok: false, error: "Menge konnte nicht aktualisiert werden." };
          }
        }
        invalidateCollectionCache();
      } else {
        if (take >= available) {
          removeLocalCollectionItem(target.id);
        } else {
          updateLocalCollectionItem(target.id, {
            quantity: available - take,
          });
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cardcap-collection-changed"));
      }
      return { ok: true };
    }

    // Sealed
    if (isAuthenticated) {
      if (take >= available) {
        const res = await fetch(
          `/api/sealed?id=${encodeURIComponent(target.id)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          return { ok: false, error: "Sealed-Produkt konnte nicht entfernt werden." };
        }
      } else {
        const res = await fetch("/api/sealed", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: target.id,
            quantity: available - take,
          }),
        });
        if (!res.ok) {
          return { ok: false, error: "Menge konnte nicht aktualisiert werden." };
        }
      }
      invalidateSealedCache();
    } else {
      const row = getLocalSealed().find((p) => p.id === target.id);
      if (!row) return { ok: false, error: "Eintrag nicht gefunden." };
      if (take >= row.quantity) {
        removeLocalSealed(target.id);
      } else {
        updateLocalSealed(target.id, { quantity: row.quantity - take });
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(SEALED_CHANGED_EVENT));
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Verkauf konnte nicht verbucht werden." };
  }
}

/** For multi-member card groups: sell units across member rows (FIFO). */
export async function applyCardGroupSale(
  memberIds: string[],
  sellQty: number,
  isAuthenticated: boolean,
  /** optional map id → qty; if missing, assumes 1 each then fetches not available */
  qtyById?: Record<string, number>,
): Promise<{ ok: boolean; error?: string }> {
  let remaining = Math.max(1, Math.floor(sellQty) || 1);

  if (!isAuthenticated) {
    for (const id of memberIds) {
      if (remaining <= 0) break;
      const row = getLocalCollection().find((i) => i.id === id);
      if (!row) continue;
      const take = Math.min(remaining, row.quantity);
      const result = await applyAssetSale(
        { id, kind: "Karte", availableQty: row.quantity },
        take,
        false,
      );
      if (!result.ok) return result;
      remaining -= take;
    }
    return remaining > 0
      ? { ok: false, error: "Nicht genug Exemplare im Bestand." }
      : { ok: true };
  }

  for (const id of memberIds) {
    if (remaining <= 0) break;
    const available = qtyById?.[id] ?? remaining;
    const take = Math.min(remaining, available);
    if (take <= 0) continue;
    const result = await applyAssetSale(
      { id, kind: "Karte", availableQty: available },
      take,
      true,
    );
    if (!result.ok) return result;
    remaining -= take;
  }

  return remaining > 0
    ? { ok: false, error: "Nicht genug Exemplare im Bestand." }
    : { ok: true };
}
