"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AddToCollectionButton } from "@/components/add-to-collection-button";
import { isInCollection } from "@/lib/collection-ids";
import { useCollectionIds } from "@/hooks/use-collection-ids";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

import { WishlistButton } from "@/components/wishlist-button";
import { WishlistHeart } from "@/components/wishlist-heart";
import {
  loadDatabaseFilters,
  saveDatabaseFilters,
} from "@/lib/database-filters";
import { wishlistItemFromTcg } from "@/lib/wishlist";
import { CardImage } from "@/components/ui/card-image";
import { DetailPanel } from "@/components/ui/detail-panel";
import {
  getCardPriceForCondition,
  getConditionPriceHint,
  PSA_CONDITIONS,
  RAW_CONDITIONS,
} from "@/lib/card-conditions";
import { Price } from "@/components/ui/price";
import {
  getCardImageFallbacks,
  getCardImageUrl,
  type TcgCard,
  type TcgSet,
} from "@/lib/pokemon-tcg";
import { isAllColorsFilter } from "@/lib/card-colors";
import {
  formatRarityEnglish,
  isAllRaritiesFilter,
  RARITY_FILTER_ALL,
  RARITY_FILTER_OPTIONS,
} from "@/lib/rarity-labels";
import {
  CARD_LANGUAGES,
  COLORS_BY_LANG,
  DEFAULT_LANGUAGE,
  type CardLanguage,
} from "@/lib/tcgdex-constants";

const PAGE_SIZE = 40;
const LOAD_AHEAD_INDEX = 20;
const CARD_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";

export function DatabaseView() {
  const [cards, setCards] = useState<TcgCard[]>([]);
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [selected, setSelected] = useState<TcgCard | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);

  const [language, setLanguage] = useState<CardLanguage>(DEFAULT_LANGUAGE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("Alle Zustände");
  const [grayNotOwned, setGrayNotOwned] = useState(false);

  const colors = COLORS_BY_LANG[language];
  const { ownedIds, refresh: refreshCollection, addOwnedId } =
    useCollectionIds();

  const scrollRef = useRef<HTMLDivElement>(null);
  const loadTriggerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    const saved = loadDatabaseFilters();
    setLanguage(saved.language);
    setSearch(saved.search);
    setDebouncedSearch(saved.search);
    setSetFilter(saved.setFilter);
    setRarityFilter(saved.rarityFilter);
    setColorFilter(saved.colorFilter);
    setConditionFilter(saved.conditionFilter);
    setGrayNotOwned(saved.grayNotOwned);
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!filtersReady) return;
    saveDatabaseFilters({
      language,
      search,
      setFilter,
      rarityFilter,
      colorFilter,
      conditionFilter,
      grayNotOwned,
    });
  }, [
    filtersReady,
    language,
    search,
    setFilter,
    rarityFilter,
    colorFilter,
    conditionFilter,
    grayNotOwned,
  ]);

  useEffect(() => {
    fetch(`/api/sets?lang=${language}`)
      .then((r) => r.json())
      .then((data) => {
        const loadedSets: TcgSet[] = data.data ?? [];
        setSets(loadedSets);
        setSetFilter((current) =>
          current && !loadedSets.some((set) => set.id === current)
            ? ""
            : current,
        );
      })
      .catch(() => {});
  }, [language]);

  const buildParams = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({
        lang: language,
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (setFilter) params.set("set", setFilter);
      if (rarityFilter && !isAllRaritiesFilter(rarityFilter)) {
        params.set("rarity", rarityFilter);
      }
      if (colorFilter && !isAllColorsFilter(colorFilter, language)) {
        params.set("color", colorFilter);
      }
      return params;
    },
    [language, debouncedSearch, setFilter, rarityFilter, colorFilter, colors],
  );

  const fetchCards = useCallback(
    async (pageNum: number, append: boolean) => {
      if (loadingRef.current && append) return;

      const generation = ++fetchGenerationRef.current;
      loadingRef.current = true;

      if (append) {
        setLoadingMore(true);
      } else {
        setInitialLoading(true);
        setError(null);
        setCards([]);
      }

      try {
        const res = await fetch(`/api/cards?${buildParams(pageNum)}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (generation !== fetchGenerationRef.current) return;

        if (!res.ok) {
          throw new Error(data.error ?? "Fehler beim Laden");
        }

        const newCards: TcgCard[] = data.data ?? [];

        setCards((prev) => {
          const combined = append ? [...prev, ...newCards] : newCards;
          const seen = new Set<string>();
          return combined.filter((card) => {
            if (seen.has(card.id)) return false;
            seen.add(card.id);
            return true;
          });
        });
        setPage(pageNum);
        setTotalCount(data.totalCount ?? 0);
        setHasMore(pageNum < (data.totalPages ?? 1));

        if (!append) {
          setPanelOpen(false);
          setSelected(null);
        }
      } catch (e) {
        if (generation !== fetchGenerationRef.current) return;
        setError(e instanceof Error ? e.message : "Fehler beim Laden");
        if (!append) setCards([]);
      } finally {
        if (generation === fetchGenerationRef.current) {
          loadingRef.current = false;
          setInitialLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildParams],
  );

  useEffect(() => {
    if (!filtersReady) return;
    fetchCards(1, false);
  }, [filtersReady, language, debouncedSearch, setFilter, rarityFilter, colorFilter, fetchCards]);

  useEffect(() => {
    const trigger = loadTriggerRef.current;
    const root = scrollRef.current;
    if (!trigger || !root || root.clientHeight < 1 || !hasMore || initialLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current) {
          fetchCards(page + 1, true);
        }
      },
      { root, rootMargin: "240px", threshold: 0 },
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [cards.length, hasMore, page, initialLoading, fetchCards]);

  const resetFilters = () => {
    setSearch("");
    setSetFilter("");
    setRarityFilter(RARITY_FILTER_ALL);
    setColorFilter("");
    setConditionFilter("Alle Zustände");
    setGrayNotOwned(false);
    setLanguage(DEFAULT_LANGUAGE);
  };

  const handleLanguageChange = (next: CardLanguage) => {
    setLanguage(next);
    setSetFilter("");
    if (
      rarityFilter &&
      !isAllRaritiesFilter(rarityFilter) &&
      !RARITY_FILTER_OPTIONS.includes(
        rarityFilter as (typeof RARITY_FILTER_OPTIONS)[number],
      )
    ) {
      setRarityFilter(RARITY_FILTER_ALL);
    }
    if (
      colorFilter &&
      !isAllColorsFilter(colorFilter, next) &&
      !COLORS_BY_LANG[next].includes(colorFilter)
    ) {
      setColorFilter("");
    }
  };

  const price = selected
    ? getCardPriceForCondition(selected, conditionFilter)
    : null;
  const priceHint = getConditionPriceHint(conditionFilter);
  const triggerIndex = Math.max(0, cards.length - LOAD_AHEAD_INDEX);
  const openCard = (card: TcgCard) => {
    setSelected(card);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelected(null);
  };

  return (
    <>
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="shrink-0 -mx-4 border-b border-[var(--border)] bg-[var(--background)] px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <PageHeader title="Kartendatenbank" />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
            <label className="text-sm text-[var(--muted)]" htmlFor="card-language">
              Sprache
            </label>
            <select
              id="card-language"
              value={language}
              onChange={(e) =>
                handleLanguageChange(e.target.value as CardLanguage)
              }
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              {CARD_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="gray-not-owned"
              type="button"
              role="switch"
              aria-checked={grayNotOwned}
              onClick={() => setGrayNotOwned((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                grayNotOwned
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--surface-elevated)]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  grayNotOwned ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <label
              htmlFor="gray-not-owned"
              className="cursor-pointer text-sm text-[var(--muted)]"
              onClick={() => setGrayNotOwned((v) => !v)}
            >
              Fehlende ausgrauen
            </label>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Kartenname, Nummer oder Set…"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            className="h-9 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm sm:max-w-[200px] sm:w-auto"
          >
            <option value="">Alle Sets</option>
            {sets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>

          <select
            value={rarityFilter || RARITY_FILTER_ALL}
            onChange={(e) => setRarityFilter(e.target.value)}
            aria-label="Seltenheit"
            className="h-9 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm sm:w-auto"
          >
            {RARITY_FILTER_OPTIONS.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity === RARITY_FILTER_ALL ? "Seltenheit" : rarity}
              </option>
            ))}
          </select>

          <select
            value={colorFilter || colors[0]}
            onChange={(e) => setColorFilter(e.target.value)}
            aria-label="Farbe"
            className="h-9 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm sm:w-auto"
          >
            {colors.map((color) => (
              <option key={color} value={color}>
                {color === colors[0] ? "Farbe" : color}
              </option>
            ))}
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            aria-label="Zustand"
            className="h-9 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm sm:w-auto"
          >
            <option value="Alle Zustände">Alle Zustände</option>
            <optgroup label="Rohkarte">
              {RAW_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </optgroup>
            <optgroup label="PSA">
              {PSA_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </optgroup>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-[var(--accent)] transition-opacity hover:opacity-70"
          >
            Filter zurücksetzen
          </button>
        </div>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
        >
        <p className="mb-4 mt-4 text-sm">
          <span className="font-semibold">
            {totalCount.toLocaleString("de-DE")}
          </span>{" "}
          <span className="text-[var(--muted)]">Karten gefunden</span>
          {cards.length > 0 && (
            <span className="text-[var(--muted)]">
              {" "}
              · {cards.length.toLocaleString("de-DE")} geladen
            </span>
          )}
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--negative)] bg-[var(--negative-soft)] px-4 py-3 text-sm text-[var(--negative)]">
            {error}
          </div>
        )}

        {initialLoading ? (
          <div className={CARD_GRID_CLASS}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2"
              >
                <div className="mb-2 aspect-[5/7] rounded-lg bg-[var(--surface-elevated)]" />
                <div className="mb-1 h-3 w-3/4 rounded bg-[var(--surface-elevated)]" />
                <div className="h-2.5 w-1/2 rounded bg-[var(--surface-elevated)]" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className={CARD_GRID_CLASS}>
              {cards.map((card, index) => {
                const cardPrice = getCardPriceForCondition(
                  card,
                  conditionFilter,
                );
                const isSelected = panelOpen && selected?.id === card.id;
                const owned = isInCollection(card.id, ownedIds);
                const dimmed = grayNotOwned && !owned;

                return (
                  <Fragment key={`${card.id}-${index}`}>
                    <div
                      className={`relative rounded-xl border p-2 transition-all ${
                        isSelected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                      } ${dimmed ? "opacity-45 grayscale" : ""}`}
                    >
                      <WishlistHeart
                        item={wishlistItemFromTcg(card)}
                        className="absolute top-1.5 right-1.5 z-10"
                      />
                      <button
                        type="button"
                        onClick={() => openCard(card)}
                        className="w-full touch-manipulation text-left"
                      >
                        <CardImage
                          src={getCardImageUrl(card)}
                          fallbacks={getCardImageFallbacks(card)}
                          alt={card.name}
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
                        <Price
                          value={cardPrice}
                          className="mt-1 text-xs"
                        />
                      </button>
                    </div>
                    {index === triggerIndex && (
                      <div
                        ref={loadTriggerRef}
                        className="col-span-full h-1 w-full"
                        aria-hidden="true"
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>

            {loadingMore && (
              <div className="mt-4 flex justify-center py-4">
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  Weitere Karten laden…
                </div>
              </div>
            )}

            {!hasMore && cards.length > 0 && (
              <p className="mt-6 pb-8 text-center text-xs text-[var(--muted)]">
                Alle Karten geladen
              </p>
            )}
          </>
        )}
        </div>
      </div>

      {selected && panelOpen && (
        <DetailPanel onClose={closePanel}>
          <CardImage
            src={getCardImageUrl(selected)}
            fallbacks={getCardImageFallbacks(selected)}
            alt={selected.name}
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
            {formatRarityEnglish(selected.rarity)}
          </p>

          <Price
            value={price}
            fallback="Preis nicht verfügbar"
            className="mt-4 text-2xl font-semibold"
          />
          {price != null && priceHint && (
            <p className="mt-1 text-xs text-[var(--muted)]">{priceHint}</p>
          )}

          <div className="mt-5 space-y-2.5 text-sm">
            {[
              ["Karten-ID", selected.collectorId ?? selected.number],
              ["Set", selected.set.name],
              ["Karten-Nr.", selected.number],
              ["Farbe", selected.types?.join(", ") ?? "—"],
              ["Seltenheit", formatRarityEnglish(selected.rarity)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-[var(--muted)]">{label}</span>
                <span className="text-right">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <AddToCollectionButton
              card={selected}
              language={language}
              condition={conditionFilter}
              onAdded={() => {
                addOwnedId(selected.id);
                void refreshCollection();
              }}
            />
            <WishlistButton item={wishlistItemFromTcg(selected)} />
          </div>
        </DetailPanel>
      )}
    </>
  );
}