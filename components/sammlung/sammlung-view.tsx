"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CARD_CONDITIONS, RAW_CONDITIONS, PSA_CONDITIONS } from "@/lib/card-conditions";
import { formatRarityEnglish } from "@/lib/rarity-labels";
import {
  CARD_LANGUAGES,
  DEFAULT_LANGUAGE,
} from "@/lib/tcgdex-constants";

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
import { formatCurrency, formatDateDE } from "@/lib/format";
import {
  getLocalCollection,
  localCollectionMetrics,
  removeLocalCollectionItem,
  updateLocalCollectionItem,
  type LocalCollectionItem,
} from "@/lib/local-collection";

const EDIT_CONDITIONS = [...RAW_CONDITIONS, ...PSA_CONDITIONS] as const;
const PAGE_SIZES = [25, 50, 100] as const;

type ViewMode = "list" | "grid";
type SortKey =
  | "recent"
  | "name"
  | "value-desc"
  | "value-asc"
  | "profit-desc"
  | "set";

type DisplayRow = {
  id: string;
  name: string;
  setName: string;
  number: string;
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
  language: string;
  variant: string;
};

function languageLabel(code: string): string {
  const found = CARD_LANGUAGES.find((l) => l.code === code.toLowerCase());
  if (found) return found.label;
  if (code.length <= 3) return code.toUpperCase();
  return code;
}

function languageShort(code: string): string {
  const c = code.toLowerCase();
  if (c === "de" || c === "deutsch") return "DE";
  if (c === "en" || c === "english" || c === "englisch") return "EN";
  if (c === "fr") return "FR";
  if (c === "es") return "ES";
  if (c === "it") return "IT";
  if (c === "ja" || c === "jp") return "JP";
  return code.slice(0, 2).toUpperCase();
}

function detectVariant(rarity?: string | null, category?: string): string {
  const r = (rarity ?? "").toLowerCase();
  if (r.includes("illustration") || r.includes("special illustration"))
    return "Illustration";
  if (r.includes("holo") || r.includes("holograf")) return "Holo";
  if (r.includes("reverse")) return "Reverse Holo";
  if (r.includes("full art") || r.includes("alt")) return "Full Art";
  if (r.includes("promo")) return "Promo";
  if ((category ?? "").toLowerCase().includes("trainer")) return "Normal";
  return "Normal";
}

function rarityBadgeClass(rarity?: string | null): string {
  const r = (rarity ?? "").toLowerCase();
  if (r.includes("illustration") || r.includes("special") || r.includes("hyper"))
    return "bg-purple-500/15 text-purple-300";
  if (r.includes("holo") || r.includes("ultra") || r.includes("rare"))
    return "bg-sky-500/15 text-sky-300";
  return "bg-[var(--surface-elevated)] text-[var(--muted)]";
}

function parseEuroInput(value: string): number | null {
  const cleaned = value.replace(/[€\s]/g, "").replace(",", ".");
  if (!cleaned.trim()) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Normalize stored dates (ISO or DE) to yyyy-mm-dd for <input type="date"> */
function toDateInputValue(raw: string | null | undefined): string {
  if (!raw || raw === "—") return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const de = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (de) {
    return `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

function displayPurchaseDate(raw: string | null | undefined): string {
  if (!raw || raw === "—") return "—";
  // Already German (mock seed uses DD.MM.YYYY)
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(raw)) return raw;
  return formatDateDE(raw);
}

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
  language?: string;
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

function mapLocalItem(item: LocalCollectionItem): DisplayRow {
  return {
    id: item.id,
    name: item.name,
    setName: item.setName,
    number: item.number,
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
    language: item.language || DEFAULT_LANGUAGE,
    variant: detectVariant(item.rarity, item.category),
  };
}

function mapApiItem(item: CollectionItemDto): DisplayRow {
  return {
    id: item.id,
    name: item.name,
    setName: item.setName,
    number: item.number,
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
    language: item.language || DEFAULT_LANGUAGE,
    variant: detectVariant(item.rarity, item.category),
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
  const [setFilter, setSetFilter] = useState("Alle Sets");
  const [languageFilter, setLanguageFilter] = useState("Alle Sprachen");
  const [conditionFilter, setConditionFilter] = useState("Alle Zustände");
  const [rarityFilter, setRarityFilter] = useState("Alle Seltenheiten");
  const [variantFilter, setVariantFilter] = useState("Alle Varianten");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [editing, setEditing] = useState(false);
  const [editQty, setEditQty] = useState(1);
  const [editCondition, setEditCondition] = useState("Near Mint");
  const [editPrice, setEditPrice] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

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
  const displayItems: DisplayRow[] = useMemo(() => {
    const fromApi = items.map(mapApiItem);
    if (isAuthenticated) {
      const apiTcg = new Set(items.map((i) => i.tcgCardId));
      const extra = localItems
        .filter((l) => !apiTcg.has(l.tcgCardId))
        .map(mapLocalItem);
      return [...fromApi, ...extra];
    }
    return localItems.map(mapLocalItem);
  }, [items, localItems, isAuthenticated]);

  const setOptions = useMemo(() => {
    const names = [...new Set(displayItems.map((i) => i.setName).filter(Boolean))];
    names.sort((a, b) => a.localeCompare(b, "de"));
    return names;
  }, [displayItems]);

  const rarityOptions = useMemo(() => {
    const names = [
      ...new Set(
        displayItems
          .map((i) => formatRarityEnglish(i.rarity) || i.rarity || "")
          .filter(Boolean),
      ),
    ];
    names.sort((a, b) => a.localeCompare(b, "de"));
    return names;
  }, [displayItems]);

  const variantOptions = useMemo(() => {
    const names = [...new Set(displayItems.map((i) => i.variant).filter(Boolean))];
    names.sort((a, b) => a.localeCompare(b, "de"));
    return names;
  }, [displayItems]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = displayItems.filter((row) => {
      if (term) {
        const haystack =
          `${row.name} ${row.setName} ${row.number} ${row.rarity ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (setFilter !== "Alle Sets" && row.setName !== setFilter) return false;
      if (languageFilter !== "Alle Sprachen") {
        const lang = languageLabel(row.language);
        const short = languageShort(row.language);
        if (
          lang !== languageFilter &&
          short !== languageFilter &&
          row.language.toLowerCase() !== languageFilter.toLowerCase()
        ) {
          return false;
        }
      }
      if (
        conditionFilter !== "Alle Zustände" &&
        row.condition !== conditionFilter
      ) {
        return false;
      }
      if (rarityFilter !== "Alle Seltenheiten") {
        const label = formatRarityEnglish(row.rarity) || row.rarity || "";
        if (label !== rarityFilter && row.rarity !== rarityFilter) return false;
      }
      if (variantFilter !== "Alle Varianten" && row.variant !== variantFilter) {
        return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "value-desc":
          return b.marketValue - a.marketValue;
        case "value-asc":
          return a.marketValue - b.marketValue;
        case "profit-desc":
          return b.profit - a.profit;
        case "set":
          return (
            a.setName.localeCompare(b.setName, "de") ||
            a.number.localeCompare(b.number, "de", { numeric: true })
          );
        case "recent":
        default:
          return 0; // keep source order (newest first for local)
      }
    });

    return rows;
  }, [
    displayItems,
    search,
    setFilter,
    languageFilter,
    conditionFilter,
    rarityFilter,
    variantFilter,
    sort,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    search,
    setFilter,
    languageFilter,
    conditionFilter,
    rarityFilter,
    variantFilter,
    sort,
    pageSize,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage, pageSize]);

  const filteredStats = useMemo(() => {
    const cards = filteredItems.length;
    const exemplare = filteredItems.reduce((s, i) => s + i.quantity, 0);
    const value = filteredItems.reduce((s, i) => s + i.marketValue, 0);
    return { cards, exemplare, value };
  }, [filteredItems]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (conditionFilter !== "Alle Zustände") {
      chips.push({
        key: "condition",
        label: conditionFilter,
        clear: () => setConditionFilter("Alle Zustände"),
      });
    }
    if (languageFilter !== "Alle Sprachen") {
      chips.push({
        key: "lang",
        label: languageFilter,
        clear: () => setLanguageFilter("Alle Sprachen"),
      });
    }
    if (variantFilter !== "Alle Varianten") {
      chips.push({
        key: "variant",
        label: variantFilter,
        clear: () => setVariantFilter("Alle Varianten"),
      });
    }
    if (setFilter !== "Alle Sets") {
      chips.push({
        key: "set",
        label: setFilter,
        clear: () => setSetFilter("Alle Sets"),
      });
    }
    if (rarityFilter !== "Alle Seltenheiten") {
      chips.push({
        key: "rarity",
        label: rarityFilter,
        clear: () => setRarityFilter("Alle Seltenheiten"),
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
  }, [
    conditionFilter,
    languageFilter,
    variantFilter,
    setFilter,
    rarityFilter,
    search,
  ]);

  const resetFilters = () => {
    setSearch("");
    setSetFilter("Alle Sets");
    setLanguageFilter("Alle Sprachen");
    setConditionFilter("Alle Zustände");
    setRarityFilter("Alle Seltenheiten");
    setVariantFilter("Alle Varianten");
  };

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

  const isLocalRow = (id: string) => id.startsWith("local-");

  const startEdit = useCallback(() => {
    if (!selectedRow) return;
    setEditQty(selectedRow.quantity);
    setEditCondition(selectedRow.condition);
    setEditPrice(
      selectedRow.purchasePrice != null
        ? selectedRow.purchasePrice.toFixed(2).replace(".", ",")
        : "",
    );
    setEditDate(toDateInputValue(selectedRow.purchaseDate));
    setEditing(true);
  }, [selectedRow]);

  const cancelEdit = () => setEditing(false);

  const saveEdit = useCallback(async () => {
    if (!selectedRow) return;
    setSaving(true);
    try {
      const purchasePrice = parseEuroInput(editPrice);
      const purchaseDate = editDate.trim() || null;
      const quantity = Math.max(1, Math.floor(editQty) || 1);
      const condition = editCondition || "Near Mint";

      if (isLocalRow(selectedRow.id) || !isAuthenticated) {
        updateLocalCollectionItem(selectedRow.id, {
          quantity,
          condition,
          purchasePrice,
          purchaseDate,
        });
        loadLocal();
        setEditing(false);
        return;
      }

      const res = await fetch("/api/collection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRow.id,
          quantity,
          condition,
          purchasePrice,
          purchaseDate,
        }),
      });
      if (!res.ok) {
        // Fallback: try local if this was somehow only local
        updateLocalCollectionItem(selectedRow.id, {
          quantity,
          condition,
          purchasePrice,
          purchaseDate,
        });
      }
      await loadCollection();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [
    selectedRow,
    editPrice,
    editDate,
    editQty,
    editCondition,
    isAuthenticated,
    loadLocal,
    loadCollection,
  ]);

  const removeSelected = useCallback(async () => {
    if (!selectedRow) return;
    const ok = window.confirm(
      `„${selectedRow.name}“ aus der Sammlung entfernen?`,
    );
    if (!ok) return;

    setSaving(true);
    try {
      if (isLocalRow(selectedRow.id) || !isAuthenticated) {
        removeLocalCollectionItem(selectedRow.id);
        loadLocal();
      } else {
        const res = await fetch("/api/collection", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedRow.id }),
        });
        if (!res.ok) {
          removeLocalCollectionItem(selectedRow.id);
          loadLocal();
        } else {
          await loadCollection();
        }
      }
      setEditing(false);
      setPanelOpen(false);
      setSelectedId(null);
    } finally {
      setSaving(false);
    }
  }, [selectedRow, isAuthenticated, loadLocal, loadCollection]);

  // Reset edit mode when switching cards
  useEffect(() => {
    setEditing(false);
  }, [selectedRow?.id]);

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
      {/* Scroll via AppShell main only — no nested overflow (was blocking wheel scroll) */}
      <div className="w-full min-w-0 pb-4">
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
            subtitle={`${displayMetrics.totalCards.toLocaleString("de-DE")} Exemplare in deiner Sammlung`}
          >
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Link
                href="/kartendatenbank"
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white transition-all hover:brightness-110 sm:w-auto"
              >
                + Karte hinzufügen
              </Link>
              <Button
                className="w-full sm:w-auto"
                variant="secondary"
                onClick={() => requireAuth(() => {})}
              >
                Kartenscanner
              </Button>
              <Button
                className="w-full sm:w-auto"
                variant="secondary"
                onClick={openImport}
              >
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

          {/* Metrics */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Exemplare gesamt"
              value={displayMetrics.totalCards.toLocaleString("de-DE")}
              periodNote={`${displayMetrics.uniqueCards.toLocaleString("de-DE")} verschiedene Karten`}
            />
            <MetricCard
              label="Einzigartige Karten"
              value={displayMetrics.uniqueCards.toLocaleString("de-DE")}
              periodNote={
                displayMetrics.totalCards > 0
                  ? `${((displayMetrics.uniqueCards / displayMetrics.totalCards) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % der Sammlung`
                  : "—"
              }
            />
            <MetricCard
              label="Duplikate"
              value={displayMetrics.duplicates.toLocaleString("de-DE")}
              periodNote="zusätzliche Exemplare"
            />
            <MetricCard
              label="Gesamtwert"
              value={formatMarketPrice(displayMetrics.totalValue)}
              positive
            />
            <MetricCard
              label="Investiert"
              value={formatCurrency(displayMetrics.invested)}
              periodNote={
                displayMetrics.totalCards > 0
                  ? `Ø ${formatCurrency(displayMetrics.invested / displayMetrics.totalCards)} pro Exemplar`
                  : undefined
              }
            />
            <MetricCard
              label="Unrealisierter Gewinn"
              value={`${displayMetrics.profitLoss >= 0 ? "+" : ""}${formatMarketPrice(displayMetrics.profitLoss)}`}
              positive={displayMetrics.profitLoss >= 0}
              colorValue
              periodNote={
                displayMetrics.invested > 0
                  ? `${displayMetrics.profitLoss >= 0 ? "+" : ""}${((displayMetrics.profitLoss / displayMetrics.invested) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % Rendite`
                  : undefined
              }
            />
          </div>

          {/* Toolbar: Suche + Filter wie Mockup */}
          <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
            <label className="relative min-w-0 flex-1 xl:max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                <SearchIcon />
              </span>
              <input
                type="search"
                placeholder="Karte, Set oder Sammelnummer suchen"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
              />
            </label>

            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
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
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
            >
              <option value="Alle Sprachen">Alle Sprachen</option>
              {CARD_LANGUAGES.map((l) => (
                <option key={l.code} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>

            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
            >
              {CARD_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
            >
              <option value="Alle Seltenheiten">Alle Seltenheiten</option>
              {rarityOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={variantFilter}
              onChange={(e) => setVariantFilter(e.target.value)}
              className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
            >
              <option value="Alle Varianten">Alle Varianten</option>
              {variantOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="recent">Zuletzt hinzugefügt</option>
              <option value="name">Name A–Z</option>
              <option value="set">Set / Nummer</option>
              <option value="value-desc">Marktwert: höchster zuerst</option>
              <option value="value-asc">Marktwert: niedrigster zuerst</option>
              <option value="profit-desc">Gewinn: höchster zuerst</option>
            </select>

            <div className="ml-auto flex h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
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
                  onClick={chip.clear}
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
            {displayItems.length > 0 && (
              <p className="shrink-0 text-xs text-[var(--muted)]">
                {filteredStats.cards.toLocaleString("de-DE")} Karten
                <span className="mx-1.5 opacity-40">·</span>
                {filteredStats.exemplare.toLocaleString("de-DE")} Exemplare
                <span className="mx-1.5 opacity-40">·</span>
                Marktwert {formatMarketPrice(filteredStats.value)}
              </p>
            )}
          </div>

          {loading && !usingDemo ? (
            <p className="text-sm text-[var(--muted)]">Sammlung wird geladen…</p>
          ) : displayItems.length > 0 ? (
            filteredItems.length > 0 ? (
              <>
                {view === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {pageItems.map((row) => {
                      const isSelected = panelOpen && row.id === activeId;
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(row.id);
                            setPanelOpen(true);
                          }}
                          className={`rounded-xl border p-2.5 text-left transition-colors ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                          }`}
                        >
                          <CardImage
                            src={row.imageUrl}
                            fallbacks={row.imageFallbacks}
                            alt={row.name}
                            size="md"
                            className="mx-auto"
                          />
                          <p className="mt-2 truncate text-sm font-medium">
                            {row.name}
                          </p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {row.setName}
                            {row.number ? ` · ${row.number}` : ""}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between gap-1">
                            <ConditionBadge condition={row.condition} />
                            <span className="tabular-nums text-xs font-medium">
                              <Price value={row.marketValue} />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="space-y-3 lg:hidden">
                      {pageItems.map((row) => {
                        const isSelected = panelOpen && row.id === activeId;
                        const profitPositive = row.profit >= 0;
                        return (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => {
                              setSelectedId(row.id);
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
                                  {row.number ? ` · ${row.number}` : ""}
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

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:block">
                      <table className="w-full min-w-[960px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
                            <th className="px-3 py-3 font-medium">Karte</th>
                            <th className="px-3 py-3 font-medium">
                              Set / Nummer
                            </th>
                            <th className="px-3 py-3 font-medium">
                              Seltenheit / Variante
                            </th>
                            <th className="px-3 py-3 font-medium">Sprache</th>
                            <th className="px-3 py-3 font-medium">Zustand</th>
                            <th className="px-3 py-3 text-right font-medium">
                              Anzahl
                            </th>
                            <th className="px-3 py-3 text-right font-medium">
                              EK / Stück
                            </th>
                            <th className="px-3 py-3 text-right font-medium">
                              Marktwert / Stück
                            </th>
                            <th className="px-3 py-3 text-right font-medium">
                              Gesamtwert
                            </th>
                            <th className="px-3 py-3 text-right font-medium">
                              Gewinn / Verlust
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.map((row) => {
                            const isSelected = panelOpen && row.id === activeId;
                            const profitPositive = row.profit >= 0;
                            const unitMarket =
                              row.quantity > 0
                                ? row.marketValue / row.quantity
                                : row.marketValue;
                            const rarityLabel =
                              formatRarityEnglish(row.rarity) ||
                              row.rarity ||
                              row.variant;

                            return (
                              <tr
                                key={row.id}
                                onClick={() => {
                                  setSelectedId(row.id);
                                  setPanelOpen(true);
                                }}
                                className={`cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 ${
                                  isSelected
                                    ? "bg-[var(--accent-soft)]"
                                    : "hover:bg-[var(--surface-elevated)]"
                                }`}
                              >
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <CardImage
                                      src={row.imageUrl}
                                      fallbacks={row.imageFallbacks}
                                      alt={row.name}
                                      size="sm"
                                    />
                                    <span className="font-medium">
                                      {row.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-[var(--muted)]">
                                  <div className="leading-snug">
                                    <p className="text-[var(--foreground)]">
                                      {row.setName || "—"}
                                    </p>
                                    {row.number && (
                                      <p className="text-xs">{row.number}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span
                                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${rarityBadgeClass(row.rarity)}`}
                                  >
                                    {rarityLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 tabular-nums text-[var(--muted)]">
                                  {languageShort(row.language)}
                                </td>
                                <td className="px-3 py-2.5">
                                  <ConditionBadge condition={row.condition} />
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums">
                                  {row.quantity}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted)]">
                                  {formatCurrency(row.purchasePrice)}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums">
                                  <Price value={unitMarket} />
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                                  <Price value={row.marketValue} />
                                </td>
                                <td
                                  className={`px-3 py-2.5 text-right tabular-nums ${
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
                  </>
                )}

                {/* Pagination */}
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-xs text-[var(--muted)]">
                    {filteredItems.length === 0
                      ? "0"
                      : `${((safePage - 1) * pageSize + 1).toLocaleString("de-DE")}–${Math.min(safePage * pageSize, filteredItems.length).toLocaleString("de-DE")}`}{" "}
                    von {filteredItems.length.toLocaleString("de-DE")} Karten
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
                      else if (safePage >= totalPages - 2)
                        n = totalPages - 4 + i;
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
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
                      onChange={(e) =>
                        setPageSize(
                          Number(e.target.value) as (typeof PAGE_SIZES)[number],
                        )
                      }
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
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Keine Karten für die gewählten Filter gefunden.{" "}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[var(--accent)] hover:underline"
                >
                  Filter zurücksetzen
                </button>
              </p>
            )
          ) : null}
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
              {editing ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--muted)]">Anzahl</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={editQty}
                      onChange={(e) =>
                        setEditQty(Number.parseInt(e.target.value, 10) || 1)
                      }
                      className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--muted)]">Zustand</span>
                    <select
                      value={editCondition}
                      onChange={(e) => setEditCondition(e.target.value)}
                      className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3"
                    >
                      {EDIT_CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--muted)]">EK pro Karte (€)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="0,00"
                      className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--muted)]">Kaufdatum</span>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3"
                    />
                  </label>
                </>
              ) : (
                <>
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
                    <span>{displayPurchaseDate(selectedRow.purchaseDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Marktwert</span>
                    <Price
                      value={selectedRow.marketValue}
                      className="font-medium"
                    />
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
                </>
              )}
            </div>

            <div className="mt-6 space-y-2">
              {editing ? (
                <>
                  <Button
                    className="w-full"
                    onClick={() => void saveEdit()}
                    disabled={saving}
                  >
                    {saving ? "Speichern…" : "Speichern"}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Abbrechen
                  </Button>
                </>
              ) : (
                <>
                  <Button className="w-full" onClick={startEdit}>
                    Bearbeiten
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => void removeSelected()}
                    disabled={saving}
                  >
                    Aus Sammlung entfernen
                  </Button>
                </>
              )}
            </div>
          </DetailPanel>
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}