"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { getEffectiveCondition } from "@/lib/card-conditions";
import {
  addToLocalCollection,
  getLocalCollectionIds,
} from "@/lib/local-collection";
import { getCollectionTcgIds } from "@/lib/collection-ids";
import type { TcgCard } from "@/lib/pokemon-tcg";
import type { CardLanguage } from "@/lib/tcgdex-constants";

export function useCollectionIds() {
  const { isAuthenticated } = useAuthMode();
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    return new Set([
      ...getCollectionTcgIds(),
      ...getLocalCollectionIds(),
    ]);
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setOwnedIds(
        new Set([...getCollectionTcgIds(), ...getLocalCollectionIds()]),
      );
      return;
    }

    try {
      const res = await fetch("/api/collection");
      if (!res.ok) {
        // Fallback: still include local ids
        setOwnedIds(
          new Set([...getCollectionTcgIds(), ...getLocalCollectionIds()]),
        );
        return;
      }
      const data = await res.json();
      const ids = new Set<string>([
        ...(data.items ?? []).map(
          (item: { tcgCardId: string }) => item.tcgCardId,
        ),
        ...getLocalCollectionIds(),
      ]);
      setOwnedIds(ids);
    } catch {
      setOwnedIds(
        new Set([...getCollectionTcgIds(), ...getLocalCollectionIds()]),
      );
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
    const onLocal = () => void refresh();
    window.addEventListener("cardcap-collection-changed", onLocal);
    window.addEventListener("storage", onLocal);
    return () => {
      window.removeEventListener("cardcap-collection-changed", onLocal);
      window.removeEventListener("storage", onLocal);
    };
  }, [refresh]);

  const addOwnedId = useCallback((tcgCardId: string) => {
    setOwnedIds((current) => new Set([...current, tcgCardId]));
  }, []);

  /**
   * Add a card to the collection (API when logged in, localStorage in demo).
   */
  const addCard = useCallback(
    async (
      card: TcgCard,
      language: CardLanguage | string = "de",
      condition = "Near Mint",
    ): Promise<{ ok: boolean; error?: string }> => {
      const cond = getEffectiveCondition(condition);

      if (!isAuthenticated) {
        addToLocalCollection(card, language, cond, 1);
        addOwnedId(card.id);
        return { ok: true };
      }

      try {
        const res = await fetch("/api/collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tcgCardId: card.id,
            language,
            condition: cond,
            quantity: 1,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // If API fails (e.g. no DB), still keep a local copy so UI works
          addToLocalCollection(card, language, cond, 1);
          addOwnedId(card.id);
          return {
            ok: true,
            error:
              typeof data.error === "string"
                ? `Server: ${data.error} — lokal gespeichert`
                : undefined,
          };
        }
        addOwnedId(card.id);
        // Also mirror locally so Assets works even if session/API flakes
        addToLocalCollection(card, language, cond, 1);
        return { ok: true };
      } catch {
        addToLocalCollection(card, language, cond, 1);
        addOwnedId(card.id);
        return { ok: true };
      }
    },
    [isAuthenticated, addOwnedId],
  );

  return { ownedIds, refresh, addOwnedId, addCard };
}
