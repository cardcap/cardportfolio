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
  const [pulseKey, setPulseKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { addCard } = useCollectionIds();

  const handleAdd = async () => {
    setLoading(true);
    setError(null);
    setPulseKey((k) => k + 1);
    try {
      const result = await addCard(card, language, condition);
      if (!result.ok) {
        throw new Error(result.error ?? "Fehler beim Speichern");
      }
      setAdded(true);
      onAdded?.();
      window.setTimeout(() => setAdded(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        key={pulseKey}
        className={`w-full collection-add-pulse ${added ? "!bg-emerald-500" : ""}`}
        disabled={loading}
        onClick={() => void handleAdd()}
      >
        {loading
          ? "Wird gespeichert…"
          : added
            ? "✓ Hinzugefügt"
            : "+ Zur Sammlung hinzufügen"}
      </Button>
      {added && (
        <p className="mt-2 text-center text-xs font-medium text-emerald-400">
          Karte ist in deiner Sammlung
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-xs text-[var(--negative)]">
          {error}
        </p>
      )}
    </div>
  );
}