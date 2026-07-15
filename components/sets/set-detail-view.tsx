"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddToCollectionButton } from "@/components/add-to-collection-button";
import { WishlistButton } from "@/components/wishlist-button";
import { wishlistItemFromTcg } from "@/lib/wishlist";
import { SetLogo } from "@/components/ui/set-logo";
import { CardImage } from "@/components/ui/card-image";
import { DetailPanel } from "@/components/ui/detail-panel";
import { MetricCard } from "@/components/ui/metric-card";
import { Price } from "@/components/ui/price";
import { formatDateDE } from "@/lib/format";
import {
  getCardImageFallbacks,
  getCardImageUrl,
  getCardPrice,
  type TcgCard,
} from "@/lib/pokemon-tcg";
import { cardMatchesColor, isAllColorsFilter } from "@/lib/card-colors";
import { formatRarityEnglish } from "@/lib/rarity-labels";
import { COLORS_BY_LANG, DEFAULT_LANGUAGE } from "@/lib/tcgdex-constants";
import type { SetDetail } from "@/lib/set-stats";

type SetDetailViewProps = {
  setId: string;
  setDetail: SetDetail;
  initialCards: TcgCard[];
  totalCount: number;
};

export function SetDetailView({
  setDetail,
  initialCards,
  totalCount,
}: SetDetailViewProps) {
  const colors = COLORS_BY_LANG[DEFAULT_LANGUAGE];

  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const filteredCards = useMemo(() => {
    const term = search.trim().toLowerCase();

    return initialCards.filter((card) => {
      if (term) {
        const haystack = [
          card.name,
          card.number,
          card.collectorId ?? "",
          card.id,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (colorFilter && !isAllColorsFilter(colorFilter, DEFAULT_LANGUAGE)) {
        if (
          !cardMatchesColor(
            {
              name: card.name,
              types: card.types,
              category: card.category,
            },
            colorFilter,
            DEFAULT_LANGUAGE,
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialCards, search, colorFilter]);

  const selected =
    filteredCards.find((card) => card.id === selectedId) ??
    initialCards.find((card) => card.id === selectedId) ??
    null;

  const openCard = (cardId: string) => {
    setSelectedId(cardId);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedId(null);
  };

  return (
    <>
      <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="w-full pb-10">
        <Link
          href="/sets"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Zurück zu Sets
        </Link>

        <div className="mb-5 flex flex-wrap items-start gap-4">
          <SetLogo
            src={setDetail.logoUrl}
            fallbacks={
              setDetail.symbolUrl && setDetail.symbolUrl !== setDetail.logoUrl
                ? [setDetail.symbolUrl]
                : []
            }
            alt={setDetail.name}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {setDetail.seriesName} · {setDetail.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {setDetail.officialCards} offizielle Karten ·{" "}
              {setDetail.secretRareCount} Secret Rares ·{" "}
              {setDetail.totalCards} gesamt
            </p>
            {setDetail.releaseDate && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                Erscheinungsdatum: {formatDateDE(setDetail.releaseDate)}
              </p>
            )}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Karten gesamt"
            value={totalCount.toLocaleString("de-DE")}
          />
          <MetricCard
            label="Offizielle Karten"
            value={String(setDetail.officialCards)}
          />
          <MetricCard
            label="Secret Rares"
            value={String(setDetail.secretRareCount)}
            accent={setDetail.secretRareCount > 0}
          />
          <MetricCard
            label="Angezeigt"
            value={filteredCards.length.toLocaleString("de-DE")}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4">
          <input
            type="search"
            placeholder="Karten in diesem Set suchen…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 min-w-[200px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          <select
            value={colorFilter || colors[0]}
            onChange={(event) => setColorFilter(event.target.value)}
            aria-label="Farbe"
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            {colors.map((color) => (
              <option key={color} value={color}>
                {color === colors[0] ? "Farbe" : color}
              </option>
            ))}
          </select>
        </div>

        {filteredCards.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Keine Karten für die gewählten Filter gefunden.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {filteredCards.map((card) => {
              const price = getCardPrice(card);
              const isSelected = card.id === selectedId && panelOpen;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => openCard(card.id)}
                  className={`rounded-xl border p-2 text-left transition-all ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <CardImage
                    src={getCardImageUrl(card)}
                    alt={card.name}
                    fallbacks={getCardImageFallbacks(card)}
                    size="lg"
                    className="mb-2"
                  />
                  <p className="truncate text-xs font-medium">{card.name}</p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {card.collectorId ?? card.number}
                  </p>
                  {card.rarity && (
                    <p className="truncate text-[10px] text-[var(--muted)]">
                      {formatRarityEnglish(card.rarity)}
                    </p>
                  )}
                  <Price value={price} className="mt-1 text-xs" />
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">
            {filteredCards.length.toLocaleString("de-DE")}
          </span>{" "}
          von {totalCount.toLocaleString("de-DE")} Karten angezeigt
        </p>
      </div>
      </div>
      </div>

      {selected && panelOpen && (
        <DetailPanel onClose={closePanel}>
          <CardImage
            src={getCardImageUrl(selected)}
            alt={selected.name}
            fallbacks={getCardImageFallbacks(selected)}
            size="lg"
            className="mb-4"
          />
          <h2 className="text-lg font-semibold">{selected.name}</h2>
          {selected.collectorId && (
            <p className="mt-1 font-mono text-sm tracking-wide text-[var(--accent)]">
              {selected.collectorId}
            </p>
          )}
          <p className="text-sm text-[var(--muted)]">
            {setDetail.seriesName} · {selected.number}
          </p>
          {selected.rarity && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatRarityEnglish(selected.rarity)}
            </p>
          )}
          {selected.types && selected.types.length > 0 && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selected.types.join(" · ")}
            </p>
          )}

          <div className="mt-5 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Aktueller Wert</span>
              <Price
                value={getCardPrice(selected)}
                className="font-medium"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Set</span>
              <span>{setDetail.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Erscheinungsdatum</span>
              <span>
                {setDetail.releaseDate
                  ? formatDateDE(setDetail.releaseDate)
                  : "—"}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <AddToCollectionButton
              card={selected}
              language={DEFAULT_LANGUAGE}
            />
            <WishlistButton item={wishlistItemFromTcg(selected)} />
          </div>
        </DetailPanel>
      )}
    </>
  );
}