"use client";

import { useState } from "react";
import { useRequireAuth } from "@/components/auth/use-require-auth";
import { Button } from "@/components/ui/button";
import { getEffectiveCondition } from "@/lib/card-conditions";
import type { TcgCard } from "@/lib/pokemon-tcg";
import type { CardLanguage } from "@/lib/tcgdex-constants";

type AddToCollectionButtonProps = {
  card: TcgCard;
  language: CardLanguage;
  condition?: string;
  onAdded?: () => void;
  className?: string;
};

export function AddToCollectionButton({
  card,
  language,
  condition = "Near Mint",
  onAdded,
  className = "",
}: AddToCollectionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { requireAuth, AuthPromptModal } = useRequireAuth({
    title: "Sammlung speichern",
    description:
      "Melde dich an, um Karten in deiner persönlichen Sammlung zu speichern.",
  });

  const handleAdd = () => {
    requireAuth(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/collection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tcgCardId: card.id,
            language,
            condition: getEffectiveCondition(condition),
            quantity: 1,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Fehler beim Speichern");
        }

        setAdded(true);
        onAdded?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Speichern");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <>
      {AuthPromptModal}
      <div className={className}>
        <Button
          className="w-full"
          disabled={loading || added}
          onClick={handleAdd}
        >
          {loading
            ? "Wird gespeichert…"
            : added
              ? "✓ In Sammlung"
              : "+ Zur Sammlung hinzufügen"}
        </Button>
        {error && (
          <p className="mt-2 text-center text-xs text-[var(--negative)]">
            {error}
          </p>
        )}
      </div>
    </>
  );
}