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

export type AddCardOptions = {
  language?: CardLanguage | string;
  condition?: string;
  quantity?: number;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  origin?: string | null;
};

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
        setOwnedIds(new Set());
        return;
      }
      const data = await res.json();
      setOwnedIds(
        new Set(
          (data.items ?? []).map(
            (item: { tcgCardId: string }) => item.tcgCardId,
          ),
        ),
      );
    } catch {
      setOwnedIds(new Set());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
    const onLocal = () => {
      if (!isAuthenticated) void refresh();
    };
    window.addEventListener("cardcap-collection-changed", onLocal);
    window.addEventListener("storage", onLocal);
    return () => {
      window.removeEventListener("cardcap-collection-changed", onLocal);
      window.removeEventListener("storage", onLocal);
    };
  }, [refresh, isAuthenticated]);

  const addOwnedId = useCallback((tcgCardId: string) => {
    setOwnedIds((current) => new Set([...current, tcgCardId]));
  }, []);

  /**
   * Add a card: API only when logged in, localStorage only in demo.
   */
  const addCard = useCallback(
    async (
      card: TcgCard,
      languageOrOpts: CardLanguage | string | AddCardOptions = "de",
      condition = "Near Mint",
    ): Promise<{ ok: boolean; error?: string }> => {
      const opts: AddCardOptions =
        typeof languageOrOpts === "object" && languageOrOpts !== null
          ? languageOrOpts
          : {
              language: languageOrOpts as string,
              condition,
            };

      const lang = opts.language ?? "de";
      const cond = getEffectiveCondition(opts.condition ?? "Near Mint");
      const quantity = Math.max(1, opts.quantity ?? 1);

      if (!isAuthenticated) {
        addToLocalCollection(card, lang, cond, quantity);
        addOwnedId(card.id);
        return { ok: true };
      }

      try {
        const res = await fetch("/api/collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tcgCardId: card.id,
            language: lang,
            condition: cond,
            quantity,
            purchasePrice: opts.purchasePrice,
            purchaseDate: opts.purchaseDate,
            origin: opts.origin,
            snapshot: {
              name: card.name,
              setId: card.set?.id,
              setName: card.set?.name,
              number: card.collectorId ?? card.number,
              imageUrl: card.images?.large || card.images?.small || "",
              imageFallbacks: card.imageFallbacks,
              rarity: card.rarity ?? null,
            },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            error:
              typeof data.error === "string"
                ? data.error
                : "Karte konnte nicht gespeichert werden.",
          };
        }
        addOwnedId(card.id);
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: "Netzwerkfehler — Karte nicht in der Datenbank gespeichert.",
        };
      }
    },
    [isAuthenticated, addOwnedId],
  );

  return { ownedIds, refresh, addOwnedId, addCard };
}
