"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SetCardDetailPanel } from "@/components/sets/set-card-detail-panel";
import { WishlistHeart } from "@/components/wishlist-heart";
import { useCollectionIds } from "@/hooks/use-collection-ids";
import { isInCollection } from "@/lib/collection-ids";
import {
  loadDatabaseFilters,
  saveDatabaseFilters,
} from "@/lib/database-filters";
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
import {
  getCardImageFallbacks,
  getCardImageUrl,
  getCardPrice,
  type TcgCard,
  type TcgSet,
} from "@/lib/pokemon-tcg";
import {
  buildSealedCatalog,
  detectProductTypeFromSearch,
  filterSealedCatalog,
  PRODUCT_TYPE_CHIPS,
  productTypeTitle,
  type CatalogSealedProduct,
  type SealedProductType,
} from "@/lib/sealed-catalog";
import { formatCurrency, formatDateDE } from "@/lib/format";
import { wishlistItemFromTcg } from "@/lib/wishlist";
import { CardImage } from "@/components/ui/card-image";
import { SealedProductImage } from "@/components/ui/sealed-product-image";
import { useWishlist } from "@/components/wishlist-provider";

const PAGE_SIZE = 40;
const LOAD_AHEAD_INDEX = 20;

type ScopeTab = "all" | "cards" | "sealed";
type SortKey =
  | "relevance"
  | "price-desc"
  | "price-asc"
  | "name"
  | "number"
  | "date-desc";

function demoPriceChange(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return Math.round(((h % 90) / 10 + 0.5) * 10) / 10;
}

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
  const [seriesFilter, setSeriesFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Alle");
  const [scope, setScope] = useState<ScopeTab>("all");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [filterOpen, setFilterOpen] = useState(false);
  const [productType, setProductType] = useState<SealedProductType | "all">(
    "all",
  );
  const [sealedLang, setSealedLang] = useState("Alle");
  const [sealedYear, setSealedYear] = useState("");
  const [sealedPage, setSealedPage] = useState(1);
  const [sealedPageSize, setSealedPageSize] = useState(24);

  const colors = COLORS_BY_LANG[language];
  const { ownedIds } = useCollectionIds();
  const { isInWishlist, toggleItem } = useWishlist();

  const scrollRef = useRef<HTMLDivElement>(null);
  const loadTriggerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const fetchGenerationRef = useRef(0);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadDatabaseFilters();
    setLanguage(saved.language);
    setSearch(saved.search);
    setDebouncedSearch(saved.search);
    setSetFilter(saved.setFilter);
    setRarityFilter(saved.rarityFilter);
    setColorFilter(saved.colorFilter);
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
      conditionFilter: "Alle Zustände",
      grayNotOwned: false,
    });
  }, [filtersReady, language, search, setFilter, rarityFilter, colorFilter]);

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

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const seriesList = useMemo(() => {
    return [...new Set(sets.map((s) => s.series).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "de"),
    );
  }, [sets]);

  const setsInSeries = useMemo(() => {
    if (!seriesFilter) return sets;
    return sets.filter((s) => s.series === seriesFilter);
  }, [sets, seriesFilter]);

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
    [language, debouncedSearch, setFilter, rarityFilter, colorFilter],
  );

  const fetchCards = useCallback(
    async (pageNum: number, append: boolean) => {
      if (loadingRef.current && append) return;
      if (scope === "sealed") {
        setCards([]);
        setTotalCount(0);
        setHasMore(false);
        setInitialLoading(false);
        return;
      }

      const generation = ++fetchGenerationRef.current;
      loadingRef.current = true;

      if (append) setLoadingMore(true);
      else {
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
        if (!res.ok) throw new Error(data.error ?? "Fehler beim Laden");

        let newCards: TcgCard[] = data.data ?? [];
        if (categoryFilter !== "Alle") {
          newCards = newCards.filter(
            (c) =>
              c.category === categoryFilter ||
              c.types?.includes(categoryFilter),
          );
        }

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
    [buildParams, scope, categoryFilter],
  );

  useEffect(() => {
    if (!filtersReady) return;
    fetchCards(1, false);
  }, [
    filtersReady,
    language,
    debouncedSearch,
    setFilter,
    rarityFilter,
    colorFilter,
    scope,
    categoryFilter,
    fetchCards,
  ]);

  useEffect(() => {
    const trigger = loadTriggerRef.current;
    const root = scrollRef.current;
    if (
      !trigger ||
      !root ||
      root.clientHeight < 1 ||
      !hasMore ||
      initialLoading ||
      scope === "sealed"
    ) {
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
  }, [cards.length, hasMore, page, initialLoading, fetchCards, scope]);

  const fullSealedCatalog = useMemo(() => buildSealedCatalog(sets), [sets]);

  // Auto-detect product type from search (e.g. "Top-Trainer-Box")
  useEffect(() => {
    const detected = detectProductTypeFromSearch(debouncedSearch);
    if (detected) {
      setProductType(detected);
      setScope("sealed");
      setSealedPage(1);
    }
  }, [debouncedSearch]);

  const sealedFiltered = useMemo(() => {
    const setName = setFilter
      ? sets.find((s) => s.id === setFilter)?.name
      : undefined;
    return filterSealedCatalog(fullSealedCatalog, {
      search: debouncedSearch || setName || "",
      productType,
      series: seriesFilter || undefined,
      language: sealedLang,
      year: sealedYear || undefined,
      sort:
        sort === "number"
          ? "relevance"
          : sort === "date-desc"
            ? "date-desc"
            : (sort as "relevance" | "price-desc" | "price-asc" | "name"),
    });
  }, [
    fullSealedCatalog,
    debouncedSearch,
    productType,
    seriesFilter,
    sealedLang,
    sealedYear,
    sort,
    setFilter,
    sets,
  ]);

  const sealedTotal = sealedFiltered.length;
  const sealedTotalPages = Math.max(
    1,
    Math.ceil(sealedTotal / sealedPageSize),
  );
  const sealedPageSafe = Math.min(sealedPage, sealedTotalPages);
  const sealedPageRows = sealedFiltered.slice(
    (sealedPageSafe - 1) * sealedPageSize,
    sealedPageSafe * sealedPageSize,
  );

  // Preview list for "all" scope header section
  const sealedPreview = sealedFiltered.slice(0, 4);

  const sortedCards = useMemo(() => {
    const rows = [...cards];
    switch (sort) {
      case "price-desc":
        return rows.sort(
          (a, b) => (getCardPrice(b) ?? 0) - (getCardPrice(a) ?? 0),
        );
      case "price-asc":
        return rows.sort(
          (a, b) => (getCardPrice(a) ?? 0) - (getCardPrice(b) ?? 0),
        );
      case "name":
        return rows.sort((a, b) => a.name.localeCompare(b.name, "de"));
      case "number":
        return rows.sort((a, b) =>
          (a.number || "").localeCompare(b.number || "", "de", {
            numeric: true,
          }),
        );
      default:
        return rows;
    }
  }, [cards, sort]);

  const cardCount = scope === "sealed" ? 0 : totalCount;
  const sealedCount = sealedTotal;
  const allCount =
    scope === "cards"
      ? cardCount
      : scope === "sealed"
        ? sealedCount
        : cardCount + sealedCount;

  const showSealed = scope === "all" || scope === "sealed";
  const showCards = scope === "all" || scope === "cards";
  const sealedOnly = scope === "sealed" || (sealedCount > 0 && cardCount === 0 && !!debouncedSearch);

  const selectedSetDetail = useMemo(() => {
    if (!selected) return null;
    const set = sets.find((s) => s.id === selected.set.id);
    return {
      id: selected.set.id,
      name: selected.set.name,
      seriesId: set?.seriesId ?? "",
      seriesName: set?.series ?? "",
      releaseDate: set?.releaseDate ?? "",
      totalCards: set?.total ?? 0,
      officialCards: set?.official ?? set?.total ?? 0,
      secretRareCount: set?.secretRareCount ?? 0,
      logoUrl: set?.images.logo ?? "",
      symbolUrl: set?.images.symbol ?? "",
      topCards: [],
    };
  }, [selected, sets]);

  return (
    <>
      <div
        ref={scrollRef}
        className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain pb-8"
      >
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Datenbank</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Karten und Sealed Produkte entdecken
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sets"
              className="inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              Sets →
            </Link>
            <Link
              href="/wunschliste"
              className="inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              Wunschliste →
            </Link>
            <Link
              href="/assets/karten"
              className="inline-flex h-9 items-center rounded-full bg-[var(--accent)] px-3.5 text-sm font-medium text-white hover:brightness-110"
            >
              Meine Sammlung →
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <label className="relative block">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche nach Karte, Produkt, Set, Sammelnummer oder Pokémon"
              className="h-12 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-11 pr-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </label>
        </div>

        {/* Scope tabs */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(
            [
              ["all", `Alle ${allCount || "…"}`],
              ["cards", `Karten ${cardCount || "…"}`],
              ["sealed", `Sealed ${sealedCount}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setScope(id);
                setSealedPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                scope === id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters row – sealed-focused when sealed tab */}
        <div className="mb-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {showCards && !sealedOnly ? (
              <>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value as CardLanguage);
                    setSetFilter("");
                    setSeriesFilter("");
                  }}
                  className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                >
                  {CARD_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      Sprache: {l.label}
                    </option>
                  ))}
                </select>
                <select
                  value={seriesFilter}
                  onChange={(e) => {
                    setSeriesFilter(e.target.value);
                    setSetFilter("");
                    setSealedPage(1);
                  }}
                  className="h-9 max-w-[11rem] rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Serie: Alle</option>
                  {seriesList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={setFilter}
                  onChange={(e) => setSetFilter(e.target.value)}
                  className="h-9 max-w-[11rem] rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Set: Alle</option>
                  {setsInSeries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="Alle">Kategorie: Alle</option>
                  {colors
                    .filter((c) => !isAllColorsFilter(c, language))
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </>
            ) : (
              <>
                <select
                  value={sealedLang}
                  onChange={(e) => {
                    setSealedLang(e.target.value);
                    setSealedPage(1);
                  }}
                  className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="Alle">Sprache: Alle</option>
                  <option value="DE">Deutsch</option>
                  <option value="EN">Englisch</option>
                  <option value="JP">Japanisch</option>
                  <option value="FR">Französisch</option>
                </select>
                <select
                  value={seriesFilter}
                  onChange={(e) => {
                    setSeriesFilter(e.target.value);
                    setSealedPage(1);
                  }}
                  className="h-9 max-w-[11rem] rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Serie: Alle</option>
                  {seriesList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={sealedYear}
                  onChange={(e) => {
                    setSealedYear(e.target.value);
                    setSealedPage(1);
                  }}
                  className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Erscheinungsjahr: Alle</option>
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={productType}
                  onChange={(e) => {
                    setProductType(e.target.value as SealedProductType | "all");
                    setSealedPage(1);
                  }}
                  className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="all">Produkttyp: Alle</option>
                  {PRODUCT_TYPE_CHIPS.map((c) =>
                    c.id === "all" ? null : (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ),
                  )}
                </select>
              </>
            )}

            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm ${
                  filterOpen || (rarityFilter && !isAllRaritiesFilter(rarityFilter))
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                }`}
              >
                <FilterIcon />
                Weitere Filter
              </button>
              {filterOpen && (
                <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 shadow-xl">
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Seltenheit
                  </label>
                  <select
                    value={rarityFilter || RARITY_FILTER_ALL}
                    onChange={(e) => setRarityFilter(e.target.value)}
                    className="mb-3 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                  >
                    {RARITY_FILTER_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Farbe / Typ
                  </label>
                  <select
                    value={colorFilter || colors[0]}
                    onChange={(e) => setColorFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                  >
                    {colors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setRarityFilter(RARITY_FILTER_ALL);
                      setColorFilter("");
                      setCategoryFilter("Alle");
                    }}
                    className="mt-3 text-xs text-[var(--accent)]"
                  >
                    Filter zurücksetzen
                  </button>
                </div>
              )}
            </div>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setSealedPage(1);
              }}
              className="ml-auto h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="relevance">Relevanz</option>
              <option value="price-desc">Preis: höchster zuerst</option>
              <option value="price-asc">Preis: niedrigster zuerst</option>
              <option value="name">Name A–Z</option>
              <option value="date-desc">Neueste zuerst</option>
              <option value="number">Nummer</option>
            </select>
          </div>

          {/* Product type chips for sealed */}
          {(scope === "sealed" || sealedOnly) && (
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_TYPE_CHIPS.map((chip) => {
                if (chip.id === "all") return null;
                const active = productType === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setProductType(active ? "all" : chip.id);
                      setSealedPage(1);
                      setScope("sealed");
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {debouncedSearch && (
          <p className="mb-2 text-sm text-[var(--muted)]">
            {allCount} Ergebnisse für „{debouncedSearch}“
          </p>
        )}

        {!sealedOnly && (
          <p className="mb-5 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--muted)]">
            <span aria-hidden>ℹ</span>
            Suche nach Karte, Produkt, Set, Sammelnummer oder Pokémon. Tipp:
            „Top-Trainer-Box“ listet alle ETBs.
          </p>
        )}

        {error && (
          <p className="mb-4 text-sm text-[var(--negative)]">{error}</p>
        )}

        {/* Full sealed listing */}
        {showSealed && sealedTotal > 0 && (scope === "sealed" || sealedOnly) && (
          <section className="mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-tight">
                {productTypeTitle(productType)}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {sealedTotal} Produkte gefunden
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {sealedPageRows.map((p) => (
                <SealedProductCard key={p.id} product={p} />
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--muted)]">
                {(sealedPageSafe - 1) * sealedPageSize + 1}–
                {Math.min(sealedPageSafe * sealedPageSize, sealedTotal)} von{" "}
                {sealedTotal} Produkten
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={sealedPageSafe <= 1}
                  onClick={() => setSealedPage((p) => Math.max(1, p - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from(
                  { length: Math.min(sealedTotalPages, 5) },
                  (_, i) => i + 1,
                ).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSealedPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
                      p === sealedPageSafe
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={sealedPageSafe >= sealedTotalPages}
                  onClick={() =>
                    setSealedPage((p) => Math.min(sealedTotalPages, p + 1))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] disabled:opacity-40"
                >
                  ›
                </button>
                <label className="ml-2 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  Pro Seite
                  <select
                    value={sealedPageSize}
                    onChange={(e) => {
                      setSealedPageSize(Number(e.target.value));
                      setSealedPage(1);
                    }}
                    className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 text-xs"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Sealed preview in "all" mode */}
        {showSealed && scope === "all" && !sealedOnly && sealedPreview.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                Sealed Produkte
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  {sealedCount} Produkte gefunden
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setScope("sealed")}
                className="text-sm font-medium text-[var(--accent)] hover:opacity-80"
              >
                Alle Sealed Produkte anzeigen →
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {sealedPreview.map((p) => (
                <SealedProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </section>
        )}

        {/* Cards section */}
        {showCards && !sealedOnly && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                Karten
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  {cardCount.toLocaleString("de-DE")} Karten gefunden
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setScope("cards")}
                className="text-sm font-medium text-[var(--accent)] hover:opacity-80"
              >
                Alle Karten anzeigen →
              </button>
            </div>

            {initialLoading ? (
              <p className="text-sm text-[var(--muted)]">Karten werden geladen…</p>
            ) : sortedCards.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                Keine Karten gefunden.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {sortedCards.map((card, index) => {
                  const price = getCardPrice(card);
                  const owned = isInCollection(card.id, ownedIds);
                  const change = demoPriceChange(card.id);
                  const trigger =
                    index === Math.max(0, sortedCards.length - LOAD_AHEAD_INDEX);

                  return (
                    <FragmentCard
                      key={card.id}
                      card={card}
                      price={price}
                      change={change}
                      owned={owned}
                      onOpen={() => {
                        setSelected(card);
                        setPanelOpen(true);
                      }}
                      triggerRef={trigger ? loadTriggerRef : undefined}
                    />
                  );
                })}
              </div>
            )}

            {loadingMore && (
              <p className="mt-4 text-center text-sm text-[var(--muted)]">
                Weitere Karten werden geladen…
              </p>
            )}
          </section>
        )}
      </div>

      {selected && panelOpen && selectedSetDetail && (
        <SetCardDetailPanel
          card={selected}
          setDetail={selectedSetDetail}
          official={selectedSetDetail.officialCards || 1}
          qty={isInCollection(selected.id, ownedIds) ? 1 : 0}
          positionLabel={
            selected.collectorId ?? selected.number ?? selected.id
          }
          onClose={() => {
            setPanelOpen(false);
            setSelected(null);
          }}
          onAddToWishlist={() => toggleItem(wishlistItemFromTcg(selected))}
          onEditCollection={() => {
            window.location.href = "/assets/karten";
          }}
        />
      )}
    </>
  );
}

function FragmentCard({
  card,
  price,
  change,
  owned,
  onOpen,
  triggerRef,
}: {
  card: TcgCard;
  price: number | null;
  change: number;
  owned: boolean;
  onOpen: () => void;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={triggerRef as React.RefObject<HTMLDivElement>} className="min-w-0">
      <div className="group relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-all hover:border-[var(--border-strong)]">
        <button
          type="button"
          onClick={onOpen}
          className="w-full text-left"
        >
          <div className="relative aspect-[5/7] bg-[var(--surface-elevated)]">
            <CardImage
              src={getCardImageUrl(card)}
              alt={card.name}
              fallbacks={getCardImageFallbacks(card)}
              size="lg"
              className="!aspect-[5/7] !h-full !w-full !rounded-none"
            />
            {owned && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                ×1
              </span>
            )}
          </div>
          <div className="space-y-0.5 p-2.5">
            <p className="truncate text-sm font-medium">{card.name}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {card.collectorId ?? card.number}
              {card.rarity ? ` · ${formatRarityEnglish(card.rarity)}` : ""}
            </p>
            <div className="flex items-end justify-between gap-1 pt-0.5">
              <span className="tabular-nums text-sm font-semibold">
                {price != null ? formatCurrency(price) : "—"}
              </span>
              <span className="tabular-nums text-[11px] text-[var(--positive)]">
                ↗ +{change.toLocaleString("de-DE")} %
              </span>
            </div>
          </div>
        </button>
        <div className="absolute right-1.5 top-1.5 z-10">
          <WishlistHeart item={wishlistItemFromTcg(card)} />
        </div>
      </div>
    </div>
  );
}

function SealedProductCard({
  product,
  compact,
}: {
  product: CatalogSealedProduct;
  compact?: boolean;
}) {
  const positive = product.changePct >= 0;
  return (
    <article
      className={`group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)] ${
        compact ? "flex gap-3 p-3" : "flex flex-col"
      }`}
    >
      <div
        className={`relative shrink-0 ${
          compact ? "h-24 w-20" : "w-full"
        }`}
      >
        <SealedProductImage
          src={product.imageUrl}
          fallbacks={product.imageFallbacks}
          alt={product.name}
          badge={product.productType}
          language={product.language}
          hue={product.hue}
          size={compact ? "sm" : "lg"}
          className={
            compact
              ? "!h-24 !w-20 !rounded-lg"
              : "!aspect-[4/5] !w-full !rounded-none !rounded-t-xl"
          }
        />
        <span className="absolute left-2 top-2 z-[3] rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-zinc-200 backdrop-blur-sm">
          Sealed
        </span>
        <div className="absolute right-1.5 top-1.5 z-[3]">
          <WishlistHeart
            item={{
              id: product.id,
              name: product.name,
              setName: product.setName,
              number: product.productType,
              imageUrl: product.imageUrl,
              imageFallbacks: product.imageFallbacks,
              price: product.price,
              kind: "Sealed",
              rarity: product.productType,
            }}
          />
        </div>
      </div>

      <div className={`min-w-0 flex-1 ${compact ? "" : "p-3"}`}>
        <p className="text-[11px] text-[var(--muted)]">{product.productType}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">
          {product.name}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]/70">
            {product.language}
          </span>
          <span className="mx-1 opacity-40">·</span>
          {product.releaseDate
            ? formatDateDE(product.releaseDate)
            : "—"}
        </p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="tabular-nums text-base font-semibold">
            {formatCurrency(product.price)}
          </span>
          <span
            className={`tabular-nums text-[11px] ${
              positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {positive ? "↗" : "↘"} {positive ? "+" : ""}
            {product.changePct.toLocaleString("de-DE")} %
            <span className="text-[var(--muted)]"> (30 Tage)</span>
          </span>
        </div>
      </div>
      {!compact && (
        <div className="flex items-center justify-end border-t border-[var(--border)] px-3 py-2 text-[var(--muted)]">
          <span className="text-sm">→</span>
        </div>
      )}
    </article>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}
