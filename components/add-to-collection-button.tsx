"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCollectionIds } from "@/hooks/use-collection-ids";
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
  const { addCard } = useCollectionIds();

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await addCard(card, language, condition);
      if (!result.ok) {
        throw new Error(result.error ?? "Fehler beim Speichern");
      }
      setAdded(true);
      onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        className="w-full"
        disabled={loading || added}
        onClick={() => void handleAdd()}
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
  );
}