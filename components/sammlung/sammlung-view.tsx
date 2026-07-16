"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CARD_CONDITIONS, RAW_CONDITIONS } from "@/lib/card-conditions";
import {
  ASSETS_RARITY_FILTER_OPTIONS,
  formatRarityEnglish,
  matchesAssetsRarityFilter,
} from "@/lib/rarity-labels";
import {
  CARD_LANGUAGES,
  DEFAULT_LANGUAGE,
} from "@/lib/tcgdex-constants";

import { useRequireAuth } from "@/components/auth/use-require-auth";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { CollectionImportDialog } from "@/components/sammlung/collection-import-dialog";
import { SetCardDetailPanel } from "@/components/sets/set-card-detail-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/ui/card-image";
import { ConditionBadge } from "@/components/ui/condition-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { Price, formatMarketPrice } from "@/components/ui/price";
import { formatCurrency } from "@/lib/format";
import {
  getLocalCollection,
  localCollectionMetrics,
  removeLocalCollectionItem,
  replaceLocalCollectionByConditions,
  updateLocalCollectionItem,
  type LocalCollectionItem,
} from "@/lib/local-collection";
import type { TcgCard } from "@/lib/pokemon-tcg";
import type { SetDetail } from "@/lib/set-stats";
import { wishlistItemFromTcg } from "@/lib/wishlist";
import { useWishlist } from "@/components/wishlist-provider";

const EDIT_CONDITIONS = [...RAW_CONDITIONS] as const;
const PAGE_SIZES = [25, 50, 100] as const;
const UI_STORAGE_KEY = "cardcap-assets-karten-ui";

type ViewMode = "list" | "grid";
type SortKey =
  | "recent"
  | "name"
  | "value-desc"
  | "value-asc"
  | "profit-desc"
  | "set";

type KartenUiState = {
  search: string;
  setFilter: string;
  languageFilter: string;
  conditionFilter: string;
  rarityFilter: string;
  sort: SortKey;
  view: ViewMode;
  page: number;
  pageSize: (typeof PAGE_SIZES)[number];
};

const DEFAULT_UI: KartenUiState = {
  search: "",
  setFilter: "Alle Sets",
  languageFilter: "Alle Sprachen",
  conditionFilter: "Alle Zustände",
  rarityFilter: "Alle Seltenheiten",
  sort: "recent",
  view: "list",
  page: 1,
  pageSize: 25,
};

function loadKartenUi(): KartenUiState {
  if (typeof window === "undefined") return DEFAULT_UI;
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return DEFAULT_UI;
    const parsed = JSON.parse(raw) as Partial<KartenUiState>;
    const pageSize = PAGE_SIZES.includes(
      parsed.pageSize as (typeof PAGE_SIZES)[number],
    )
      ? (parsed.pageSize as (typeof PAGE_SIZES)[number])
      : DEFAULT_UI.pageSize;
    return {
      search: typeof parsed.search === "string" ? parsed.search : DEFAULT_UI.search,
      setFilter:
        typeof parsed.setFilter === "string"
          ? parsed.setFilter
          : DEFAULT_UI.setFilter,
      languageFilter:
        typeof parsed.languageFilter === "string"
          ? parsed.languageFilter
          : DEFAULT_UI.languageFilter,
      conditionFilter:
        typeof parsed.conditionFilter === "string"
          ? parsed.conditionFilter
          : DEFAULT_UI.conditionFilter,
      rarityFilter:
        typeof parsed.rarityFilter === "string"
          ? parsed.rarityFilter
          : DEFAULT_UI.rarityFilter,
      sort:
        parsed.sort === "name" ||
        parsed.sort === "value-desc" ||
        parsed.sort === "value-asc" ||
        parsed.sort === "profit-desc" ||
        parsed.sort === "set" ||
        parsed.sort === "recent"
          ? parsed.sort
          : DEFAULT_UI.sort,
      view: parsed.view === "grid" ? "grid" : "list",
      page:
        typeof parsed.page === "number" && parsed.page >= 1
          ? Math.floor(parsed.page)
          : 1,
      pageSize,
    };
  } catch {
    return DEFAULT_UI;
  }
}

type DisplayRow = {
  id: string;
  tcgCardId: string;
  setId: string;
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

function rowToTcgCard(row: DisplayRow): TcgCard {
  const unit =
    row.quantity > 0 ? row.marketValue / row.quantity : row.marketValue;
  return {
    id: row.tcgCardId || row.id,
    name: row.name,
    number: row.number,
    rarity: row.rarity ?? undefined,
    types: row.types,
    category: row.category,
    set: { id: row.setId || "unknown", name: row.setName },
    collectorId: row.number || undefined,
    images: {
      small: row.imageUrl,
      large: row.imageUrl,
    },
    imageFallbacks: row.imageFallbacks,
    cardmarket: {
      prices: {
        trendPrice: unit || undefined,
        averageSellPrice: unit || undefined,
      },
    },
  };
}

function rowToSetDetail(row: DisplayRow): SetDetail {
  return {
    id: row.setId || "unknown",
    name: row.setName || "Unbekanntes Set",
    seriesId: "",
    seriesName: "",
    releaseDate: "",
    totalCards: 0,
    officialCards: 0,
    secretRareCount: 0,
    logoUrl: "",
    symbolUrl: "",
    topCards: [],
  };
}

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
    tcgCardId: item.tcgCardId,
    setId: item.setId,
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
    tcgCardId: item.tcgCardId,
    setId: "",
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
  const { toggleItem } = useWishlist();
  const [importOpen, setImportOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CollectionItemDto[]>([]);
  const [localItems, setLocalItems] = useState<LocalCollectionItem[]>([]);
  const [metrics, setMetrics] = useState<CollectionMetrics | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uiReady, setUiReady] = useState(false);
  const [search, setSearch] = useState(DEFAULT_UI.search);
  const [setFilter, setSetFilter] = useState(DEFAULT_UI.setFilter);
  const [languageFilter, setLanguageFilter] = useState(DEFAULT_UI.languageFilter);
  const [conditionFilter, setConditionFilter] = useState(
    DEFAULT_UI.conditionFilter,
  );
  const [rarityFilter, setRarityFilter] = useState(DEFAULT_UI.rarityFilter);
  const [sort, setSort] = useState<SortKey>(DEFAULT_UI.sort);
  const [view, setView] = useState<ViewMode>(DEFAULT_UI.view);
  const [page, setPage] = useState(DEFAULT_UI.page);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZES)[number]>(DEFAULT_UI.pageSize);
  const skipPageResetRef = useRef(true);
  const [editing, setEditing] = useState(false);
  const [editQty, setEditQty] = useState(1);
  const [editCondition, setEditCondition] = useState("Near Mint");
  /** One condition per exemplar when qty > 1 */
  const [editConditions, setEditConditions] = useState<string[]>(["Near Mint"]);
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

  // Restore filters / page size after mount (SSR-safe)
  useEffect(() => {
    const saved = loadKartenUi();
    setSearch(saved.search);
    setSetFilter(saved.setFilter);
    setLanguageFilter(saved.languageFilter);
    setConditionFilter(saved.conditionFilter);
    setRarityFilter(saved.rarityFilter);
    setSort(saved.sort);
    setView(saved.view);
    setPage(saved.page);
    setPageSize(saved.pageSize);
    setUiReady(true);
    // Next filter change may reset page; ignore the restore itself
    skipPageResetRef.current = true;
  }, []);

  // Persist filters so they survive pagination and leaving/re-entering the page
  useEffect(() => {
    if (!uiReady || typeof window === "undefined") return;
    const payload: KartenUiState = {
      search,
      setFilter,
      languageFilter,
      conditionFilter,
      rarityFilter,
      sort,
      view,
      page,
      pageSize,
    };
    try {
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }, [
    uiReady,
    search,
    setFilter,
    languageFilter,
    conditionFilter,
    rarityFilter,
    sort,
    view,
    page,
    pageSize,
  ]);

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
      if (!matchesAssetsRarityFilter(row.rarity, rarityFilter)) return false;
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
    sort,
  ]);

  // Reset page when filters/pageSize change — but not on initial restore
  useEffect(() => {
    if (skipPageResetRef.current) {
      skipPageResetRef.current = false;
      return;
    }
    setPage(1);
  }, [
    search,
    setFilter,
    languageFilter,
    conditionFilter,
    rarityFilter,
    sort,
    pageSize,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  // Prefer stored page; only clamp when we actually have rows (avoid wipe during load)
  const safePage =
    filteredItems.length === 0
      ? 1
      : Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (filteredItems.length === 0) return;
    if (page > totalPages) setPage(totalPages);
  }, [filteredItems.length, page, totalPages]);

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
  }, [conditionFilter, languageFilter, setFilter, rarityFilter, search]);

  const resetFilters = () => {
    setSearch("");
    setSetFilter("Alle Sets");
    setLanguageFilter("Alle Sprachen");
    setConditionFilter("Alle Zustände");
    setRarityFilter("Alle Seltenheiten");
    setPage(1);
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

  const selectedIndex = selectedRow
    ? filteredItems.findIndex((r) => r.id === selectedRow.id)
    : -1;

  const isLocalRow = (id: string) => id.startsWith("local-");

  const startEdit = useCallback(() => {
    if (!selectedRow) return;
    const qty = Math.max(1, selectedRow.quantity);
    setEditQty(qty);
    setEditCondition(selectedRow.condition);
    setEditConditions(
      Array.from({ length: qty }, () => selectedRow.condition || "Near Mint"),
    );
    setEditPrice(
      selectedRow.purchasePrice != null
        ? selectedRow.purchasePrice.toFixed(2).replace(".", ",")
        : "",
    );
    setEditDate(toDateInputValue(selectedRow.purchaseDate));
    setEditing(true);
  }, [selectedRow]);

  const cancelEdit = () => setEditing(false);

  const changeEditQty = (raw: number) => {
    const qty = Math.max(1, Math.floor(raw) || 1);
    setEditQty(qty);
    setEditConditions((prev) => {
      if (qty === prev.length) return prev;
      if (qty < prev.length) return prev.slice(0, qty);
      const fill = prev[prev.length - 1] || editCondition || "Near Mint";
      return [...prev, ...Array.from({ length: qty - prev.length }, () => fill)];
    });
  };

  const setExemplarCondition = (index: number, condition: string) => {
    setEditConditions((prev) => {
      const next = [...prev];
      next[index] = condition;
      return next;
    });
    // Keep single-select in sync when only one copy
    if (editQty === 1) setEditCondition(condition);
  };

  const saveEdit = useCallback(async () => {
    if (!selectedRow) return;
    setSaving(true);
    try {
      const purchasePrice = parseEuroInput(editPrice);
      const purchaseDate = editDate.trim() || null;
      const quantity = Math.max(1, Math.floor(editQty) || 1);
      const perCopy =
        editConditions.length === quantity
          ? editConditions.map((c) => c || "Near Mint")
          : Array.from(
              { length: quantity },
              (_, i) =>
                editConditions[i] || editCondition || "Near Mint",
            );
      const uniqueConditions = new Set(perCopy);
      const multiCondition = uniqueConditions.size > 1;

      if (isLocalRow(selectedRow.id) || !isAuthenticated) {
        if (multiCondition) {
          replaceLocalCollectionByConditions(selectedRow.id, perCopy, {
            purchasePrice,
            purchaseDate,
          });
        } else {
          updateLocalCollectionItem(selectedRow.id, {
            quantity,
            condition: perCopy[0] || "Near Mint",
            purchasePrice,
            purchaseDate,
          });
        }
        loadLocal();
        setEditing(false);
        return;
      }

      if (multiCondition) {
        // Split: remove original, re-add per condition group
        await fetch("/api/collection", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedRow.id }),
        });
        const counts = new Map<string, number>();
        for (const c of perCopy) {
          counts.set(c, (counts.get(c) ?? 0) + 1);
        }
        for (const [condition, qty] of counts) {
          const addRes = await fetch("/api/collection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tcgCardId: selectedRow.tcgCardId,
              condition,
              quantity: qty,
              language: selectedRow.language,
            }),
          });
          if (addRes.ok) {
            const body = (await addRes.json()) as {
              data?: { id?: string };
            };
            if (body.data?.id) {
              await fetch("/api/collection", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: body.data.id,
                  purchasePrice,
                  purchaseDate,
                }),
              });
            }
          }
        }
        // Also keep local mirror in sync for demo merge
        replaceLocalCollectionByConditions(selectedRow.id, perCopy, {
          purchasePrice,
          purchaseDate,
        });
        await loadCollection();
        setEditing(false);
        return;
      }

      const condition = perCopy[0] || "Near Mint";
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
    editConditions,
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
              label="Gewinn / Verlust"
              value={`${displayMetrics.profitLoss > 0 ? "+" : ""}${formatMarketPrice(displayMetrics.profitLoss)}`}
              positive={displayMetrics.profitLoss > 0}
              negative={displayMetrics.profitLoss < 0}
              colorValue
              periodNote={
                displayMetrics.invested > 0
                  ? `${displayMetrics.profitLoss > 0 ? "+" : ""}${((displayMetrics.profitLoss / displayMetrics.invested) * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} % Rendite`
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
              {ASSETS_RARITY_FILTER_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
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
                        const profitClass =
                          row.profit > 0
                            ? "text-[var(--positive)]"
                            : row.profit < 0
                              ? "text-[var(--negative)]"
                              : "text-[var(--muted)]";
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
                                <p className={`tabular-nums text-xs font-medium ${profitClass}`}>
                                  {row.profit > 0 ? "+" : ""}
                                  <Price value={row.profit} className={profitClass} />
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
                            const profitClass =
                              row.profit > 0
                                ? "text-[var(--positive)]"
                                : row.profit < 0
                                  ? "text-[var(--negative)]"
                                  : "text-[var(--muted)]";
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
                                  className={`px-3 py-2.5 text-right tabular-nums font-medium ${profitClass}`}
                                >
                                  {row.profit > 0 ? "+" : ""}
                                  <Price
                                    value={row.profit}
                                    className={profitClass}
                                  />
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

      {selectedRow && panelOpen && !editing && (
        <SetCardDetailPanel
          card={rowToTcgCard(selectedRow)}
          setDetail={rowToSetDetail(selectedRow)}
          official={1}
          qty={selectedRow.quantity}
          positionLabel={
            selectedRow.number ||
            `${selectedIndex + 1}/${filteredItems.length}`
          }
          onClose={() => {
            setPanelOpen(false);
            setEditing(false);
          }}
          onPrev={() => {
            if (selectedIndex > 0) {
              setSelectedId(filteredItems[selectedIndex - 1].id);
            }
          }}
          onNext={() => {
            if (
              selectedIndex >= 0 &&
              selectedIndex < filteredItems.length - 1
            ) {
              setSelectedId(filteredItems[selectedIndex + 1].id);
            }
          }}
          hasPrev={selectedIndex > 0}
          hasNext={
            selectedIndex >= 0 && selectedIndex < filteredItems.length - 1
          }
          onAddToWishlist={() =>
            toggleItem(wishlistItemFromTcg(rowToTcgCard(selectedRow)))
          }
          onEditCollection={startEdit}
          collectionButtonLabel="Bearbeiten"
          onRemoveFromCollection={() => void removeSelected()}
          hideCollectionLink
          languageLabel={languageShort(selectedRow.language)}
          collectionDetails={{
            condition: selectedRow.condition,
            purchasePrice: selectedRow.purchasePrice,
            profit: selectedRow.profit,
            purchaseDate: selectedRow.purchaseDate,
            marketValue: selectedRow.marketValue,
          }}
        />
      )}

      {/* Edit mode — same shell style as database detail panel */}
      {selectedRow && panelOpen && editing && (
        <>
          <button
            type="button"
            aria-label="Detailansicht schließen"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => {
              setEditing(false);
              setPanelOpen(false);
            }}
          />
          <aside className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 flex max-h-[min(88dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:inset-x-auto lg:inset-y-4 lg:left-auto lg:right-4 lg:bottom-4 lg:top-4 lg:w-[min(100vw-2rem,26rem)] lg:max-h-none lg:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
              <p className="text-sm font-medium">Bearbeiten</p>
              <button
                type="button"
                onClick={cancelEdit}
                aria-label="Schließen"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="flex gap-3">
                <CardImage
                  src={selectedRow.imageUrl}
                  fallbacks={selectedRow.imageFallbacks}
                  alt={selectedRow.name}
                  size="md"
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-tight">
                    {selectedRow.name}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {selectedRow.setName}
                    {selectedRow.number ? ` · ${selectedRow.number}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-[var(--muted)]">Anzahl</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={editQty}
                    onChange={(e) =>
                      changeEditQty(Number.parseInt(e.target.value, 10) || 1)
                    }
                    className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 tabular-nums"
                  />
                </label>

                {editQty <= 1 ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-[var(--muted)]">Zustand</span>
                    <select
                      value={editConditions[0] || editCondition}
                      onChange={(e) => {
                        setEditCondition(e.target.value);
                        setEditConditions([e.target.value]);
                      }}
                      className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3"
                    >
                      {EDIT_CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--muted)]">
                        Zustand pro Exemplar
                      </span>
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
                        onClick={() => {
                          const all = editConditions[0] || "Near Mint";
                          setEditConditions(
                            Array.from({ length: editQty }, () => all),
                          );
                        }}
                      >
                        Alle gleich setzen
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Bei unterschiedlichen Zuständen werden getrennte
                      Einträge in der Sammlung angelegt.
                    </p>
                    <ul className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                      {Array.from({ length: editQty }, (_, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2"
                        >
                          <span className="w-20 shrink-0 text-xs text-[var(--muted)]">
                            Exemplar {i + 1}
                          </span>
                          <select
                            value={
                              editConditions[i] || editCondition || "Near Mint"
                            }
                            onChange={(e) =>
                              setExemplarCondition(i, e.target.value)
                            }
                            className="h-9 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                          >
                            {EDIT_CONDITIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <label className="flex flex-col gap-1">
                  <span className="text-[var(--muted)]">EK pro Karte (€)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="0,00"
                    className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 tabular-nums"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[var(--muted)]">Kaufdatum</span>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3"
                  />
                </label>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={saving}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? "Speichern…" : "Speichern"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex h-11 w-full items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--foreground)]"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </aside>
        </>
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