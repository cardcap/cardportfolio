"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cardMatchesColor, isAllColorsFilter } from "@/lib/card-colors";
import { CARD_CONDITIONS } from "@/lib/card-conditions";
import { formatRarityEnglish } from "@/lib/rarity-labels";
import { COLORS_BY_LANG, DEFAULT_LANGUAGE } from "@/lib/tcgdex-constants";

import { useRequireAuth } from "@/components/auth/use-require-auth";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { CollectionImportDialog } from "@/components/sammlung/collection-import-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/ui/card-image";
import { ConditionBadge } from "@/components/ui/condition-badge";
import { DetailPanel } from "@/components/ui/detail-panel";
import { MetricCard } from "@/components/ui/metric-card";
import { Price, formatMarketPrice } from "@/components/ui/price";
import { formatCurrency } from "@/lib/format";
import {
  getLocalCollection,
  localCollectionMetrics,
  type LocalCollectionItem,
} from "@/lib/local-collection";

type CollectionItemDto = {
  id: string;
  tcgCardId: string;
  name: string;
  setName: string;
  number: string;
  imageUrl: string;
  imageFallbacks: string[];
  condition: string;
  quantity: number;
  purchasePrice: number | null;
  purchaseDate: string | null;
  marketValue: number;
  profit: number | null;
  rarity: string | null;
  colors?: string[];
  types?: string[];
  category?: string;
};

type CollectionMetrics = {
  totalCards: number;
  uniqueCards: number;
  duplicates: number;
  totalValue: number;
  invested: number;
  profitLoss: number;
};

function mapLocalItem(item: LocalCollectionItem) {
  return {
    id: item.id,
    name: item.name,
    setName: item.setName,
    imageUrl: item.imageUrl,
    imageFallbacks: item.imageFallbacks,
    condition: item.condition,
    quantity: item.quantity,
    purchasePrice: item.purchasePrice ?? 0,
    purchaseDate: item.purchaseDate ?? "—",
    marketValue: item.marketValue,
    profit: item.profit ?? 0,
    colors: item.types,
    types: item.types,
    category: item.category,
    rarity: item.rarity,
  };
}

export function SammlungView() {
  const { isAuthenticated, isDemo } = useAuthMode();
  const [importOpen, setImportOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CollectionItemDto[]>([]);
  const [localItems, setLocalItems] = useState<LocalCollectionItem[]>([]);
  const [metrics, setMetrics] = useState<CollectionMetrics | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("Alle Zustände");
  const colors = COLORS_BY_LANG[DEFAULT_LANGUAGE];

  const { requireAuth, AuthPromptModal } = useRequireAuth({
    title: "Sammlung verwalten",
    description:
      "Karten aus der Datenbank landen in deiner Sammlung. Mit Konto werden sie serverseitig gespeichert.",
  });

  const loadLocal = useCallback(() => {
    setLocalItems(getLocalCollection());
  }, []);

  const loadCollection = useCallback(async () => {
    loadLocal();
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const res = await fetch("/api/collection");
      if (!res.ok) return;
      const data = await res.json();
      const loaded: CollectionItemDto[] = data.items ?? [];
      setItems(loaded);
      setMetrics(data.metrics ?? null);
      setSelectedId((current) => current ?? loaded[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadLocal]);

  useEffect(() => {
    void loadCollection();
    const onLocal = () => loadLocal();
    window.addEventListener("cardcap-collection-changed", onLocal);
    window.addEventListener("storage", onLocal);
    return () => {
      window.removeEventListener("cardcap-collection-changed", onLocal);
      window.removeEventListener("storage", onLocal);
    };
  }, [loadCollection, loadLocal]);

  const usingDemo = isDemo || !isAuthenticated;

  // Prefer cards the user actually added (local and/or API) over static demo seed
  const displayItems: Array<{
    id: string;
    name: string;
    setName: string;
    imageUrl: string;
    imageFallbacks?: string[];
    condition: string;
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
    marketValue: number;
    profit: number;
    colors?: string[];
    types?: string[];
    category?: string;
    rarity?: string | null;
  }> = useMemo(() => {
    const fromApi = items.map((item) => ({
      id: item.id,
      name: item.name,
      setName: item.setName,
      imageUrl: item.imageUrl,
      imageFallbacks: item.imageFallbacks,
      condition: item.condition,
      quantity: item.quantity,
      purchasePrice: item.purchasePrice ?? 0,
      purchaseDate: item.purchaseDate ?? "—",
      marketValue: item.marketValue,
      profit: item.profit ?? 0,
      colors: item.colors,
      types: item.types,
      category: item.category,
      rarity: item.rarity,
    }));
    const fromLocal = localItems.map(mapLocalItem);

    if (isAuthenticated) {
      // Merge: API first, then local-only ids
      const apiIds = new Set(fromApi.map((i) => i.id));
      const apiTcg = new Set(items.map((i) => i.tcgCardId));
      const extraLocal = fromLocal.filter(
        (i) => !apiIds.has(i.id) && !apiTcg.has(i.id.replace(/^local-/, "")),
      );
      // Better: match by tcgCardId from local items
      const extra = localItems
        .filter((l) => !apiTcg.has(l.tcgCardId))
        .map(mapLocalItem);
      return [...fromApi, ...extra];
    }

    // Demo: only user-added local cards (not the static mock seed)
    return fromLocal;
  }, [items, localItems, isAuthenticated]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return displayItems.filter((row) => {
      if (term) {
        const haystack = `${row.name} ${row.setName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (colorFilter && !isAllColorsFilter(colorFilter, DEFAULT_LANGUAGE)) {
        const types =
          row.types && row.types.length > 0
            ? row.types
            : row.colors && row.colors.length > 0
              ? row.colors
              : undefined;

        if (
          !cardMatchesColor(
            { name: row.name, types, category: row.category },
            colorFilter,
            DEFAULT_LANGUAGE,
          )
        ) {
          return false;
        }
      }

      if (
        conditionFilter &&
        conditionFilter !== "Alle Zustände" &&
        row.condition !== conditionFilter
      ) {
        return false;
      }

      return true;
    });
  }, [displayItems, search, colorFilter, conditionFilter]);

  const displayMetrics = useMemo(() => {
    if (isAuthenticated && metrics && items.length > 0) {
      // Recompute if we merged local extras
      if (displayItems.length === items.length) return metrics;
    }
    if (displayItems.length === 0) {
      return {
        totalCards: 0,
        uniqueCards: 0,
        duplicates: 0,
        totalValue: 0,
        invested: 0,
        profitLoss: 0,
      };
    }
    if (!isAuthenticated || items.length === 0) {
      return localCollectionMetrics(localItems);
    }
    // Merged list metrics
    const totalCards = displayItems.reduce((s, i) => s + i.quantity, 0);
    const uniqueCards = new Set(displayItems.map((i) => i.name)).size;
    const totalValue = displayItems.reduce((s, i) => s + i.marketValue, 0);
    const invested = displayItems.reduce(
      (s, i) => s + i.purchasePrice * i.quantity,
      0,
    );
    return {
      totalCards,
      uniqueCards,
      duplicates: Math.max(0, totalCards - uniqueCards),
      totalValue: Math.round(totalValue * 100) / 100,
      invested: Math.round(invested * 100) / 100,
      profitLoss: Math.round((totalValue - invested) * 100) / 100,
    };
  }, [
    isAuthenticated,
    metrics,
    items.length,
    displayItems,
    localItems,
  ]);

  const activeId = selectedId ?? displayItems[0]?.id ?? null;
  const selectedRow =
    filteredItems.find((row) => row.id === activeId) ??
    filteredItems[0] ??
    null;

  const openImport = () => {
    requireAuth(() => setImportOpen(true));
  };

  return (
    <>
      {AuthPromptModal}
      <CollectionImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void loadCollection()}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mb-1 text-xs text-[var(--muted)]">
            <Link href="/assets/sealed" className="hover:text-[var(--foreground)]">
              Assets
            </Link>
            <span className="mx-1 opacity-50">/</span>
            <span className="text-[var(--foreground)]">Karten</span>
            <span className="mx-1.5 opacity-50">·</span>
            <Link href="/assets/sealed" className="hover:text-[var(--foreground)]">
              Sealed
            </Link>
          </div>
          <PageHeader
            title="Karten"
            subtitle={`${displayMetrics.totalCards.toLocaleString("de-DE")} Karten in deiner Sammlung`}
          >
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Link
                href="/kartendatenbank"
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white transition-all hover:brightness-110 sm:w-auto"
              >
                + Karte hinzufügen
              </Link>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={() => requireAuth(() => {})}>
                Kartenscanner
              </Button>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={openImport}>
                Excel-Import
              </Button>
            </div>
          </PageHeader>

          {usingDemo && displayItems.length > 0 && (
            <p className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
              Demo-Modus: Karten werden lokal im Browser gespeichert. Mit Konto
              werden sie dauerhaft in deinem Account abgelegt.
            </p>
          )}

          {displayItems.length === 0 && !loading && (
            <div className="mb-4 rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center">
              <p className="font-medium">Deine Sammlung ist noch leer</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Füge Karten in der{" "}
                <Link href="/kartendatenbank" className="text-[var(--accent)]">
                  Datenbank
                </Link>{" "}
                über „Zur Sammlung hinzufügen“ hinzu — oder importiere Excel/CSV.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/kartendatenbank"
                  className="inline-flex h-10 items-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white"
                >
                  Zur Datenbank
                </Link>
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  Sammlung importieren
                </Button>
              </div>
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <input
              type="search"
              placeholder="Suche nach Karte, Set oder Nummer…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)] sm:min-w-[240px] sm:flex-1"
            />
            <select
              value={colorFilter || colors[0]}
              onChange={(event) => setColorFilter(event.target.value)}
              aria-label="Farbe"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm sm:w-auto"
            >
              {colors.map((color) => (
                <option key={color} value={color}>
                  {color === colors[0] ? "Farbe" : color}
                </option>
              ))}
            </select>
            <select
              value={conditionFilter}
              onChange={(event) => setConditionFilter(event.target.value)}
              aria-label="Zustand"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm sm:w-auto"
            >
              {CARD_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition === "Alle Zustände" ? "Zustand" : condition}
                </option>
              ))}
            </select>
            {["Alle Sets", "Alle Sprachen"].map((filter) => (
              <select
                key={filter}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] sm:w-auto"
              >
                <option>{filter}</option>
              </select>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              label="Karten insgesamt"
              value={displayMetrics.totalCards.toLocaleString("de-DE")}
            />
            <MetricCard
              label="Einzigartige Karten"
              value={displayMetrics.uniqueCards.toLocaleString("de-DE")}
            />
            <MetricCard
              label="Duplikate"
              value={displayMetrics.duplicates.toLocaleString("de-DE")}
            />
            <MetricCard
              label="Gesamtwert"
              value={formatMarketPrice(displayMetrics.totalValue)}
              positive
            />
            <MetricCard
              label="Investiert"
              value={formatCurrency(displayMetrics.invested)}
            />
            <MetricCard
              label="Gewinn / Verlust"
              value={`${displayMetrics.profitLoss >= 0 ? "+" : ""}${formatMarketPrice(displayMetrics.profitLoss)}`}
              positive={displayMetrics.profitLoss >= 0}
            />
          </div>

          {loading && !usingDemo ? (
            <p className="text-sm text-[var(--muted)]">Sammlung wird geladen…</p>
          ) : displayItems.length > 0 ? (
            filteredItems.length > 0 ? (
            <>
              <div className="space-y-3 lg:hidden">
                {filteredItems.map((row) => {
                  const isSelected = panelOpen && row.id === activeId;
                  const profitPositive = row.profit >= 0;

                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => {
                        if (!usingDemo) setSelectedId(row.id);
                        setPanelOpen(true);
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition-colors touch-manipulation ${
                        isSelected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--border)] bg-[var(--surface)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CardImage
                          src={row.imageUrl}
                          fallbacks={row.imageFallbacks}
                          alt={row.name}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{row.name}</p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {row.setName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabular-nums text-sm font-medium">
                            <Price value={row.marketValue} />
                          </p>
                          <p
                            className={`tabular-nums text-xs ${
                              profitPositive
                                ? "text-[var(--positive)]"
                                : "text-[var(--negative)]"
                            }`}
                          >
                            {profitPositive ? "+" : ""}
                            <Price value={row.profit} />
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <ConditionBadge condition={row.condition} />
                        <span className="text-[var(--muted)]">
                          ×{row.quantity}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted)]">
                      <th className="px-4 py-3 font-medium">Karte</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Set
                      </th>
                      <th className="px-4 py-3 font-medium">Zustand</th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">
                        Anzahl
                      </th>
                      <th className="hidden px-4 py-3 font-medium lg:table-cell">
                        EK
                      </th>
                      <th className="px-4 py-3 font-medium">Marktwert</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        G/V
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((row) => {
                      const isSelected = panelOpen && row.id === activeId;
                      const profitPositive = row.profit >= 0;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => {
                            if (!usingDemo) setSelectedId(row.id);
                            setPanelOpen(true);
                          }}
                          className={`cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 ${
                            isSelected
                              ? "bg-[var(--accent-soft)]"
                              : "hover:bg-[var(--surface-elevated)]"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <CardImage
                                src={row.imageUrl}
                                fallbacks={row.imageFallbacks}
                                alt={row.name}
                                size="sm"
                              />
                              <span className="font-medium">{row.name}</span>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 text-[var(--muted)] sm:table-cell">
                            {row.setName}
                          </td>
                          <td className="px-4 py-3">
                            <ConditionBadge condition={row.condition} />
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            {row.quantity}
                          </td>
                          <td className="hidden tabular-nums px-4 py-3 lg:table-cell">
                            {formatCurrency(row.purchasePrice)}
                          </td>
                          <td className="tabular-nums px-4 py-3">
                            <Price value={row.marketValue} />
                          </td>
                          <td
                            className={`hidden tabular-nums px-4 py-3 sm:table-cell ${
                              profitPositive
                                ? "text-[var(--positive)]"
                                : "text-[var(--negative)]"
                            }`}
                          >
                            {profitPositive ? "+" : ""}
                            <Price value={row.profit} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-center text-xs text-[var(--muted)]">
                {filteredItems.length.toLocaleString("de-DE")} Einträge
              </p>
            </>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Keine Karten für die gewählten Filter gefunden.
              </p>
            )
          ) : null}
        </div>
      </div>

      {selectedRow && panelOpen && (
          <DetailPanel onClose={() => setPanelOpen(false)}>
            <CardImage
              src={selectedRow.imageUrl}
              fallbacks={selectedRow.imageFallbacks}
              alt={selectedRow.name}
              size="lg"
              className="detail-panel-sticky-preview mb-4"
            />
            <h2 className="text-lg font-semibold">{selectedRow.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selectedRow.setName}
            </p>
            {selectedRow.rarity && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {formatRarityEnglish(selectedRow.rarity)}
              </p>
            )}

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Anzahl in Sammlung</span>
                <span className="font-medium">{selectedRow.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Zustand</span>
                <ConditionBadge condition={selectedRow.condition} />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">EK pro Karte</span>
                <span className="tabular-nums">
                  {formatCurrency(selectedRow.purchasePrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Kaufdatum</span>
                <span>{selectedRow.purchaseDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Marktwert</span>
                <Price value={selectedRow.marketValue} className="font-medium" />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Gewinn / Verlust</span>
                <span
                  className={
                    selectedRow.profit >= 0
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]"
                  }
                >
                  {selectedRow.profit >= 0 ? "+" : ""}
                  <Price value={selectedRow.profit} />
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Button
                className="w-full"
                onClick={() => requireAuth(() => {})}
              >
                Bearbeiten
              </Button>
              <Button
                variant="danger"
                className="w-full"
                onClick={() => requireAuth(() => {})}
              >
                Aus Sammlung entfernen
              </Button>
            </div>
          </DetailPanel>
      )}
    </>
  );
}