"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SealedOpenDialog } from "@/components/assets/sealed-open-dialog";
import { SealedProductImage } from "@/components/ui/sealed-product-image";
import { formatCurrency, formatPercent } from "@/lib/format";
import { addToLocalCollectionDetailed } from "@/lib/local-collection";
import {
  getLocalSealed,
  removeLocalSealed,
  SEALED_CHANGED_EVENT,
} from "@/lib/local-sealed";
import {
  getSealedMetrics,
  type SealedCategory,
  type SealedProduct,
} from "@/lib/mock-data";
import type { TcgCard } from "@/lib/pokemon-tcg";

type SortKey =
  | "newest"
  | "name"
  | "name-desc"
  | "value-desc"
  | "value-asc"
  | "profit-desc"
  | "profit-asc";
type ViewMode = "list" | "grid";

const PAGE_SIZES = [25, 50, 100] as const;

const CATEGORIES: Array<SealedCategory | "Alle"> = [
  "Alle",
  "Display",
  "Elite Trainer Box",
  "Booster Bundle",
  "Kollektion",
  "Tin",
  "Blister",
];

const LANGUAGES = ["Alle Sprachen", "DE", "EN", "JP"] as const;
const CONDITIONS = [
  "Alle Zustände",
  "OVP",
  "leichte Mängel",
  "beschädigt",
] as const;

export function SealedView() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Alle");
  const [setFilter, setSetFilter] = useState("Alle Sets");
  const [language, setLanguage] =
    useState<(typeof LANGUAGES)[number]>("Alle Sprachen");
  const [condition, setCondition] =
    useState<(typeof CONDITIONS)[number]>("Alle Zustände");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZES)[number]>(25);
  const [openProduct, setOpenProduct] = useState<SealedProduct | null>(null);
  const [confirmProduct, setConfirmProduct] =
    useState<SealedProduct | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [inventory, setInventory] = useState<SealedProduct[]>([]);

  // Load sealed inventory (localStorage, seeded from demo)
  useEffect(() => {
    setInventory(getLocalSealed());
    const onChange = () => setInventory(getLocalSealed());
    window.addEventListener(SEALED_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SEALED_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const handleOpenConfirm = useCallback(
    (result: {
      product: SealedProduct;
      cards: Array<{
        cardId: string;
        name: string;
        setName?: string;
        collectorId?: string;
        marketValue: number;
        quantity: number;
        costPerUnit: number;
        costTotal: number;
        origin: string;
      }>;
      residual: { name: string; costTotal: number } | null;
    }) => {
      const today = new Date().toISOString().slice(0, 10);
      const lang =
        result.product.language === "EN"
          ? "en"
          : result.product.language === "JP"
            ? "ja"
            : "de";

      // 1) Add pulled cards to Assets → Karten (local collection)
      for (const c of result.cards) {
        const tcg: TcgCard = {
          id: c.cardId,
          name: c.name,
          number: c.collectorId ?? "",
          set: {
            id: c.cardId.includes("-")
              ? c.cardId.slice(0, c.cardId.lastIndexOf("-"))
              : "",
            name: c.setName ?? result.product.setName,
          },
          images: { small: "", large: "" },
          collectorId: c.collectorId,
          cardmarket: {
            prices: {
              trendPrice: c.marketValue,
              averageSellPrice: c.marketValue,
            },
          },
        };
        addToLocalCollectionDetailed(tcg, {
          language: lang,
          condition: "Near Mint",
          quantity: c.quantity,
          purchasePrice: c.costPerUnit,
          purchaseDate: today,
          origin: c.origin,
        });
      }

      // 2) Remove sealed product entirely from Sealed list
      //    (EK-Verteilung nutzt die gesamte Zeile)
      const next = removeLocalSealed(result.product.id);
      setInventory(next);

      const cardCount = result.cards.reduce((s, c) => s + c.quantity, 0);
      setToast(
        `${cardCount} Karte${cardCount === 1 ? "" : "n"} unter Assets → Karten` +
          ` · „${result.product.name}“ aus Sealed entfernt` +
          (result.residual
            ? ` · Restposten ${result.residual.name}`
            : ""),
      );
      setTimeout(() => setToast(null), 5000);
    },
    [],
  );

  const setOptions = useMemo(
    () =>
      Array.from(new Set(inventory.map((p) => p.setName))).sort((a, b) =>
        a.localeCompare(b, "de"),
      ),
    [inventory],
  );

  const metrics = useMemo(() => getSealedMetrics(inventory), [inventory]);

  const filtered = useMemo(() => {
    let rows = [...inventory];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.setName.toLowerCase().includes(q) ||
          (p.ean?.includes(q) ?? false),
      );
    }
    if (category !== "Alle") rows = rows.filter((p) => p.category === category);
    if (setFilter !== "Alle Sets")
      rows = rows.filter((p) => p.setName === setFilter);
    if (language !== "Alle Sprachen")
      rows = rows.filter((p) => p.language === language);
    if (condition !== "Alle Zustände")
      rows = rows.filter((p) => p.condition === condition);

    rows.sort((a, b) => {
      const valueA = a.marketValue * a.quantity;
      const valueB = b.marketValue * b.quantity;
      const profitA = valueA - a.purchasePrice * a.quantity;
      const profitB = valueB - b.purchasePrice * b.quantity;
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "name-desc":
          return b.name.localeCompare(a.name, "de");
        case "value-desc":
          return valueB - valueA;
        case "value-asc":
          return valueA - valueB;
        case "profit-desc":
          return profitB - profitA;
        case "profit-asc":
          return profitA - profitB;
        case "newest":
        default:
          return 0; // newest: keep inventory order
      }
    });
    return rows;
  }, [inventory, search, category, setFilter, language, condition, sort]);

  const filteredStats = useMemo(() => {
    const products = filtered.length;
    const units = filtered.reduce((s, p) => s + p.quantity, 0);
    const value = filtered.reduce(
      (s, p) => s + p.marketValue * p.quantity,
      0,
    );
    return { products, units, value };
  }, [filtered]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (category !== "Alle") {
      chips.push({
        key: "category",
        label: category,
        clear: () => setCategory("Alle"),
      });
    }
    if (setFilter !== "Alle Sets") {
      chips.push({
        key: "set",
        label: setFilter,
        clear: () => setSetFilter("Alle Sets"),
      });
    }
    if (language !== "Alle Sprachen") {
      chips.push({
        key: "lang",
        label: language,
        clear: () => setLanguage("Alle Sprachen"),
      });
    }
    if (condition !== "Alle Zustände") {
      chips.push({
        key: "condition",
        label: condition,
        clear: () => setCondition("Alle Zustände"),
      });
    }
    if (search.trim()) {
      chips.push({
        key: "search",
        label: `„${search.trim()}“`,
        clear: () => setSearch(""),
      });
    }
    return chips;
  }, [category, setFilter, language, condition, search]);

  const resetFilters = () => {
    setSearch("");
    setCategory("Alle");
    setSetFilter("Alle Sets");
    setLanguage("Alle Sprachen");
    setCondition("Alle Zustände");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="pb-4">
      <SealedOpenDialog
        open={!!openProduct}
        product={openProduct}
        onClose={() => setOpenProduct(null)}
        onConfirm={handleOpenConfirm}
      />

      {confirmProduct && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50"
            aria-label="Schließen"
            onClick={() => setConfirmProduct(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sealed-open-confirm-title"
            className="fixed inset-x-4 top-[20%] z-50 mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:inset-x-auto"
          >
            <h2
              id="sealed-open-confirm-title"
              className="text-lg font-semibold"
            >
              Sealed wirklich öffnen?
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Bist du sicher, dass du{" "}
              <span className="font-medium text-[var(--foreground)]">
                „{confirmProduct.name}“
              </span>{" "}
              öffnen möchtest?
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
              <li className="flex gap-2">
                <span className="text-[var(--accent)]" aria-hidden>
                  ·
                </span>
                <span>
                  Das Produkt verschwindet aus der Sealed-Liste.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)]" aria-hidden>
                  ·
                </span>
                <span>
                  Die gezogenen Karten erscheinen unter{" "}
                  <Link
                    href="/assets/karten"
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    Assets → Karten
                  </Link>
                  .
                </span>
              </li>
            </ul>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmProduct(null)}
                className="h-10 flex-1 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenProduct(confirmProduct);
                  setConfirmProduct(null);
                }}
                className="h-10 flex-1 rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110"
              >
                Ja, öffnen
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="mb-4 rounded-xl border border-[var(--positive)]/30 bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive)]">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">
            <Link href="/assets/karten" className="hover:text-[var(--foreground)]">
              Assets
            </Link>
            <span className="mx-1.5 opacity-50">/</span>
            <span className="text-[var(--foreground)]">Sealed</span>
            <span className="mx-1.5 opacity-50">·</span>
            <Link href="/assets/karten" className="hover:text-[var(--foreground)]">
              Karten
            </Link>
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            Sealed Produkte
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Displays, Boxen und weitere originalverpackte Produkte verwalten
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/kartendatenbank"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white transition-all hover:brightness-110"
          >
            <span className="text-base leading-none">+</span>
            Produkt hinzufügen
          </Link>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <BarcodeIcon />
            Barcode scannen
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ImportIcon />
            Excel-Import
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)]"
            aria-label="Benachrichtigungen"
          >
            <BellIcon />
          </button>
        </div>
      </div>

      {/* Primary metrics */}
      <div className="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile
          icon="chart"
          label="Gesamtwert"
          value={formatCurrency(metrics.totalValue)}
          hint={`+${metrics.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
          positive
        />
        <MetricTile
          icon="coins"
          label="Investiert"
          value={formatCurrency(metrics.invested)}
        />
        <MetricTile
          icon="trend"
          label="Gewinn / Verlust"
          value={`${metrics.profitLoss >= 0 ? "+" : ""}${formatCurrency(metrics.profitLoss)}`}
          hint={formatPercent(metrics.returnRate)}
          positive={metrics.profitLoss >= 0}
          negative={metrics.profitLoss < 0}
        />
        <MetricTile
          icon="tag"
          label="Ø Wert pro Produkt"
          value={formatCurrency(metrics.avgValue)}
        />
      </div>

      {/* Secondary metrics */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SmallStat
          label="Produkte gesamt"
          value={String(metrics.productCount)}
          icon="box"
        />
        <SmallStat label="Sets" value={String(metrics.sets)} icon="layers" />
      </div>

      {/* Toolbar: Suche + Filter (Sortierung in der Filtergruppe, Toggle rechts) */}
      <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
        <label className="relative min-w-0 flex-1 xl:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Produkt, Set oder Produktnummer suchen"
            className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </label>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as typeof category);
              setPage(1);
            }}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "Alle" ? "Alle Kategorien" : c}
              </option>
            ))}
          </select>

          <select
            value={setFilter}
            onChange={(e) => {
              setSetFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            <option value="Alle Sets">Alle Sets</option>
            {setOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as typeof language);
              setPage(1);
            }}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value as typeof condition);
              setPage(1);
            }}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="name">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="value-desc">Marktwert: höchster zuerst</option>
            <option value="value-asc">Marktwert: niedrigster zuerst</option>
            <option value="profit-desc">Gewinn: höchster zuerst</option>
            <option value="profit-asc">Gewinn: niedrigster zuerst</option>
          </select>
        </div>

        <div className="flex h-10 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5 xl:ml-auto">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex h-full items-center justify-center rounded-full px-3 ${
              view === "list"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Listenansicht"
            aria-pressed={view === "list"}
          >
            <ListIcon />
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`inline-flex h-full items-center justify-center rounded-full px-3 ${
              view === "grid"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Kachelansicht"
            aria-pressed={view === "grid"}
          >
            <GridIcon />
          </button>
        </div>
      </div>

      {/* Active filter chips + summary */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-h-[1.75rem] flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                chip.clear();
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]"
            >
              {chip.label}
              <span aria-hidden className="opacity-70">
                ×
              </span>
            </button>
          ))}
          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Alle zurücksetzen
            </button>
          )}
        </div>
        <p className="shrink-0 text-xs text-[var(--muted)]">
          {filteredStats.products.toLocaleString("de-DE")} Produkte
          <span className="mx-1.5 opacity-40">·</span>
          {filteredStats.units.toLocaleString("de-DE")} Stück
          <span className="mx-1.5 opacity-40">·</span>
          Marktwert {formatCurrency(filteredStats.value)}
        </p>
      </div>

      {/* Table / grid */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {view === "list" ? (
          <>
            <div className="hidden border-b border-[var(--border)] px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--muted)] xl:grid xl:grid-cols-[2rem_minmax(12rem,1.6fr)_minmax(7rem,1fr)_7rem_3rem_minmax(6rem,0.9fr)_3.5rem_6rem_6rem_5.5rem_6rem_1.5rem] xl:gap-2 xl:px-5">
              <span>
                <input type="checkbox" className="rounded border-[var(--border)]" aria-label="Alle auswählen" />
              </span>
              <span>Produkt</span>
              <span>Set</span>
              <span>Kategorie</span>
              <span>Sprache</span>
              <span>Zustand</span>
              <span className="text-right">Menge</span>
              <span className="text-right">EK / Stück</span>
              <span className="text-right">Marktwert / Stück</span>
              <span className="text-right">Gesamtwert</span>
              <span className="text-right">Gewinn / Verlust</span>
              <span />
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {pageRows.map((row) => (
                <SealedRow
                  key={row.id}
                  product={row}
                  onOpen={() => setConfirmProduct(row)}
                />
              ))}
              {pageRows.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-[var(--muted)]">
                  Keine Produkte für diese Filter.
                </li>
              )}
            </ul>
          </>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageRows.map((row) => (
              <SealedCard
                key={row.id}
                product={row}
                onOpen={() => setConfirmProduct(row)}
              />
            ))}
          </div>
        )}

        <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-[var(--muted)]">
              {filtered.length === 0
                ? "0"
                : `${((safePage - 1) * pageSize + 1).toLocaleString("de-DE")}–${Math.min(safePage * pageSize, filtered.length).toLocaleString("de-DE")}`}{" "}
              von {filtered.length.toLocaleString("de-DE")} Produkten
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40"
                aria-label="Vorherige Seite"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let n: number;
                if (totalPages <= 5) n = i + 1;
                else if (safePage <= 3) n = i + 1;
                else if (safePage >= totalPages - 2) n = totalPages - 4 + i;
                else n = safePage - 2 + i;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm ${
                      n === safePage
                        ? "bg-[var(--accent)] font-medium text-white"
                        : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
              {totalPages > 5 && safePage < totalPages - 2 && (
                <>
                  <span className="px-1 text-[var(--muted)]">…</span>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-[var(--border)] px-2 text-sm text-[var(--muted)]"
                  >
                    {totalPages}
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40"
                aria-label="Nächste Seite"
              >
                ›
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              Pro Seite
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(
                    Number(e.target.value) as (typeof PAGE_SIZES)[number],
                  );
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--foreground)]"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>ℹ</span>
              Marktpreise zuletzt aktualisiert: {metrics.pricesUpdatedLabel}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SealedRow({
  product,
  onOpen,
}: {
  product: SealedProduct;
  onOpen: () => void;
}) {
  const totalMarket = product.marketValue * product.quantity;
  const totalCost = product.purchasePrice * product.quantity;
  const profit = totalMarket - totalCost;
  const profitPct = totalCost ? (profit / totalCost) * 100 : 0;
  const positive = profit >= 0;
  const canOpen = true;

  return (
    <li className="px-4 py-3 transition-colors hover:bg-[var(--surface-elevated)]/50 sm:px-5">
      {/* mobile */}
      <div className="flex gap-3 xl:hidden">
        <ProductThumb product={product} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="truncate text-xs text-[var(--muted)]">{product.setName}</p>
            </div>
            <CategoryBadge category={product.category} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <span>{product.language}</span>
            <ConditionBadge condition={product.condition} />
            <span>×{product.quantity}</span>
          </div>
          {canOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="mt-2 text-xs font-medium text-[var(--accent)] hover:opacity-80"
            >
              Öffnen →
            </button>
          )}
          <div className="mt-2 flex items-end justify-between">
            <div className="text-xs text-[var(--muted)]">
              <span className="tabular-nums">{formatCurrency(product.marketValue)}</span>
              <span className="mx-1">·</span>
              <span className="tabular-nums text-[var(--foreground)]">
                {formatCurrency(totalMarket)}
              </span>
            </div>
            <p
              className={`tabular-nums text-sm font-medium ${
                positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
              }`}
            >
              {positive ? "+" : ""}
              {formatCurrency(profit)}
            </p>
          </div>
        </div>
      </div>

      {/* desktop */}
      <div className="hidden items-center gap-2 xl:grid xl:grid-cols-[2rem_minmax(12rem,1.6fr)_minmax(7rem,1fr)_7rem_3rem_minmax(6rem,0.9fr)_3.5rem_6rem_6rem_5.5rem_6rem_1.5rem]">
        <input type="checkbox" className="rounded border-[var(--border)]" aria-label={product.name} />
        <div className="flex min-w-0 items-center gap-3">
          <ProductThumb product={product} />
          <p className="truncate text-sm font-medium">{product.name}</p>
        </div>
        <p className="truncate text-sm text-[var(--muted)]">{product.setName}</p>
        <CategoryBadge category={product.category} />
        <span className="text-sm text-[var(--muted)]">{product.language}</span>
        <ConditionBadge condition={product.condition} />
        <span className="tabular-nums text-right text-sm">{product.quantity}</span>
        <div className="text-right">
          <p className="tabular-nums text-sm">{formatCurrency(product.purchasePrice)}</p>
          <p className="tabular-nums text-[10px] text-[var(--muted)]">
            Gesamt: {formatCurrency(totalCost)}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular-nums text-sm">{formatCurrency(product.marketValue)}</p>
          <p className="tabular-nums text-[10px] text-[var(--muted)]">
            Gesamt: {formatCurrency(totalMarket)}
          </p>
        </div>
        <p className="tabular-nums text-right text-sm font-medium">
          {formatCurrency(totalMarket)}
        </p>
        <div className="text-right">
          <p
            className={`tabular-nums text-sm font-medium ${
              positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {positive ? "+" : ""}
            {formatCurrency(profit)}
          </p>
          <p
            className={`tabular-nums text-[10px] ${
              positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {positive ? "+" : ""}
            {profitPct.toLocaleString("de-DE", { maximumFractionDigits: 2 })} %
          </p>
        </div>
        {canOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
            title="Öffnen"
          >
            Öffnen
          </button>
        ) : (
          <button
            type="button"
            className="text-[var(--muted)]"
            aria-label="Menü"
          >
            ⋮
          </button>
        )}
      </div>
    </li>
  );
}

function SealedCard({
  product,
  onOpen,
}: {
  product: SealedProduct;
  onOpen: () => void;
}) {
  const totalMarket = product.marketValue * product.quantity;
  const profit =
    totalMarket - product.purchasePrice * product.quantity;
  const positive = profit >= 0;
  const canOpen = true;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]/40 p-4">
      <div className="flex gap-3">
        <ProductThumb product={product} large />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <p className="truncate text-xs text-[var(--muted)]">{product.setName}</p>
          <div className="mt-2">
            <CategoryBadge category={product.category} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="tabular-nums text-sm font-medium">{formatCurrency(totalMarket)}</p>
          <p className="text-[10px] text-[var(--muted)]">×{product.quantity}</p>
        </div>
        <div className="text-right">
          <p
            className={`tabular-nums text-sm font-medium ${
              positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {positive ? "+" : ""}
            {formatCurrency(profit)}
          </p>
          {canOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="mt-1 text-xs font-medium text-[var(--accent)]"
            >
              Öffnen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductThumb({
  product,
  large,
}: {
  product: SealedProduct;
  large?: boolean;
}) {
  return (
    <SealedProductImage
      src={product.imageUrl}
      fallbacks={product.imageFallbacks}
      alt={product.name}
      badge={product.category}
      language={product.language}
      size="sm"
      className={
        large
          ? "!h-16 !w-16 shrink-0 ring-1 ring-[var(--border)]"
          : "!h-12 !w-12 shrink-0 ring-1 ring-[var(--border)]"
      }
    />
  );
}

function CategoryBadge({ category }: { category: SealedCategory }) {
  return (
    <span className="inline-flex w-fit rounded-md bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)] ring-1 ring-[var(--border)]">
      {category}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: SealedProduct["condition"] }) {
  const styles =
    condition === "beschädigt"
      ? "bg-red-500/15 text-red-300 ring-red-400/25"
      : condition === "leichte Mängel"
        ? "bg-amber-500/15 text-amber-300 ring-amber-400/25"
        : "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25";
  return (
    <span
      className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${styles}`}
    >
      {condition}
    </span>
  );
}

function MetricTile({
  icon,
  label,
  value,
  hint,
  positive,
  negative,
}: {
  icon: "box" | "chart" | "coins" | "trend" | "tag";
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon === "box" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
            <path d="M12 12 4 7M12 12l8-5M12 12v10" />
          </svg>
        )}
        {icon === "chart" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M4 19V5M4 19h16" />
            <path d="M7 15l4-5 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {icon === "coins" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <ellipse cx="12" cy="7" rx="7" ry="3" />
            <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
            <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
          </svg>
        )}
        {icon === "trend" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {icon === "tag" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M20 12 12 4H5v7l8 8 7-7Z" />
            <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
        <p
          className={`tabular-nums mt-0.5 text-lg font-semibold tracking-tight ${
            positive ? "text-[var(--positive)]" : negative ? "text-[var(--negative)]" : ""
          }`}
        >
          {value}
        </p>
        {hint && (
          <p
            className={`tabular-nums text-xs ${
              positive ? "text-[var(--positive)]" : negative ? "text-[var(--negative)]" : "text-[var(--muted)]"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: "tag" | "layers" | "box";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]">
        {icon === "tag" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M20 12 12 4H5v7l8 8 7-7Z" />
            <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
          </svg>
        )}
        {icon === "layers" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z" />
            <path d="M3.5 12.5 12 17l8.5-4.5" />
          </svg>
        )}
        {icon === "box" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
          </svg>
        )}
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
        <p className="tabular-nums text-base font-semibold">{value}</p>
      </div>
    </div>
  );
}



function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

function BarcodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6v12M7 6v12M10 6v12M12 6v12M15 6v12M18 6v12M21 6v12" strokeLinecap="round" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" strokeLinecap="round" />
      <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
