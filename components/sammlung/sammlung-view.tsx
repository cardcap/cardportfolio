"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/ui/card-image";
import { ConditionBadge } from "@/components/ui/condition-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { Price, formatMarketPrice } from "@/components/ui/price";
import { formatCurrency } from "@/lib/format";
import { conditionRank } from "@/lib/card-conditions";
import {
  fetchCollectionCached,
  invalidateCollectionCache,
  peekCollectionCache,
} from "@/lib/assets-client-cache";
import {
  getLocalCollection,
  itemInvested,
  localCollectionMetrics,
  removeLocalCollectionItem,
  replaceLocalCollectionByCopies,
  replaceLocalCollectionForCard,
  updateLocalCollectionItem,
  type LocalCollectionItem,
  type LocalExemplar,
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
  | "name-desc"
  | "value-desc"
  | "value-asc"
  | "profit-desc"
  | "profit-asc"
  | "set";

type KartenUiState = {
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
    const parsed = JSON.parse(raw) as Partial<KartenUiState> & {
      search?: string;
    };
    const pageSize = PAGE_SIZES.includes(
      parsed.pageSize as (typeof PAGE_SIZES)[number],
    )
      ? (parsed.pageSize as (typeof PAGE_SIZES)[number])
      : DEFAULT_UI.pageSize;
    return {
      // search is intentionally never restored — always empty on visit
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
        parsed.sort === "name-desc" ||
        parsed.sort === "value-desc" ||
        parsed.sort === "value-asc" ||
        parsed.sort === "profit-desc" ||
        parsed.sort === "profit-asc" ||
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
  /** Per-copy EK/condition when saved */
  exemplars?: LocalExemplar[];
  /** All storage row ids that make up this display group (different conditions) */
  groupMemberIds?: string[];
};

/** Flatten a storage row into exemplar list */
function rowToExemplars(row: DisplayRow): LocalExemplar[] {
  if (row.exemplars && row.exemplars.length > 0) {
    return row.exemplars.map((e) => ({
      condition: e.condition || row.condition,
      purchasePrice: e.purchasePrice,
      purchaseDate: e.purchaseDate ?? row.purchaseDate ?? null,
    }));
  }
  const date =
    row.purchaseDate && row.purchaseDate !== "—" ? row.purchaseDate : null;
  return Array.from({ length: Math.max(1, row.quantity) }, () => ({
    condition: row.condition,
    purchasePrice: row.purchasePrice,
    purchaseDate: date,
  }));
}

/**
 * Collapse multiple condition-rows of the same tcgCard into one expandable row.
 */
function groupByTcgCard(rows: DisplayRow[]): DisplayRow[] {
  const order: string[] = [];
  const buckets = new Map<string, DisplayRow[]>();
  for (const row of rows) {
    const key = row.tcgCardId || row.id;
    if (!buckets.has(key)) {
      order.push(key);
      buckets.set(key, []);
    }
    buckets.get(key)!.push(row);
  }

  return order.map((key) => {
    const group = buckets.get(key)!;
    if (group.length === 1) {
      const only = group[0];
      // Ensure exemplars exist for expand UI
      return {
        ...only,
        exemplars: rowToExemplars(only),
        groupMemberIds: [only.id],
      };
    }

    const base = group[0];
    const exemplars = group.flatMap(rowToExemplars);
    const quantity = exemplars.length;
    const marketValue = group.reduce((s, g) => s + g.marketValue, 0);
    const invested = exemplars.reduce(
      (s, e) => s + (e.purchasePrice ?? 0),
      0,
    );
    const avgEk =
      quantity > 0 ? Math.round((invested / quantity) * 100) / 100 : 0;
    const profit = Math.round((marketValue - invested) * 100) / 100;

    // Primary condition = most common
    const counts = new Map<string, number>();
    for (const e of exemplars) {
      const c = e.condition || "Near Mint";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    let primary = base.condition;
    let max = 0;
    for (const [c, n] of counts) {
      if (n > max) {
        max = n;
        primary = c;
      }
    }

    return {
      ...base,
      // Stable group id for expand/selection (first member stays addressable via groupMemberIds)
      id: base.id,
      condition: primary,
      quantity,
      purchasePrice: avgEk,
      marketValue: Math.round(marketValue * 100) / 100,
      profit,
      exemplars,
      groupMemberIds: group.map((g) => g.id),
    };
  });
}

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

function resolveSetId(row: DisplayRow): string {
  if (row.setId?.trim()) return row.setId.trim();
  // tcgCardId is often "{setId}-{localId}"
  const id = row.tcgCardId || "";
  const i = id.lastIndexOf("-");
  return i > 0 ? id.slice(0, i) : "";
}

function rowToSetDetail(
  row: DisplayRow,
  setReleaseById: Record<string, string> = {},
): SetDetail {
  const setId = resolveSetId(row);
  const releaseDate =
    (setId && setReleaseById[setId]) ||
    (row.setName
      ? setReleaseById[row.setName.toLowerCase()]
      : undefined) ||
    "";
  return {
    id: setId || "unknown",
    name: row.setName || "Unbekanntes Set",
    seriesId: "",
    seriesName: "",
    releaseDate,
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
  setId?: string;
  origin?: string | null;
  exemplars?: LocalExemplar[];
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
  const invested = itemInvested(item);
  const avgEk =
    item.quantity > 0
      ? Math.round((invested / item.quantity) * 100) / 100
      : (item.purchasePrice ?? 0);
  const profit =
    Math.round((item.marketValue - invested) * 100) / 100;
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
    purchasePrice: avgEk,
    purchaseDate: item.purchaseDate ?? "—",
    marketValue: item.marketValue,
    profit,
    colors: item.types,
    types: item.types,
    category: item.category,
    rarity: item.rarity,
    language: item.language || DEFAULT_LANGUAGE,
    variant: detectVariant(item.rarity, item.category),
    exemplars: item.exemplars,
  };
}

function mapApiItem(item: CollectionItemDto): DisplayRow {
  return {
    id: item.id,
    tcgCardId: item.tcgCardId,
    setId: item.setId ?? "",
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
    exemplars: item.exemplars,
  };
}

export function SammlungView() {
  const { isAuthenticated, isDemo, isLoading: authLoading } = useAuthMode();
  const { toggleItem } = useWishlist();
  const [importOpen, setImportOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const cached = peekCollectionCache();
  const [loading, setLoading] = useState(() => !cached);
  const [items, setItems] = useState<CollectionItemDto[]>(
    () => (cached?.items as CollectionItemDto[] | undefined) ?? [],
  );
  const [localItems, setLocalItems] = useState<LocalCollectionItem[]>([]);
  const [metrics, setMetrics] = useState<CollectionMetrics | null>(
    () => (cached?.metrics as CollectionMetrics | null) ?? null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uiReady, setUiReady] = useState(false);
  const [search, setSearch] = useState("");
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
  /** One EK (DE format string) per exemplar when qty > 1 */
  const [editPrices, setEditPrices] = useState<string[]>([""]);
  const [editPrice, setEditPrice] = useState("");
  /** One purchase date (yyyy-mm-dd) per exemplar when qty > 1 */
  const [editDates, setEditDates] = useState<string[]>([""]);
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);
  /** Expanded multi-copy rows in the table */
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  /** Multi-select for bulk actions (row ids from filtered list) */
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  /** setId → ISO release date from catalog (for Erscheinungsdatum) */
  const [setReleaseById, setSetReleaseById] = useState<Record<string, string>>(
    {},
  );

  // Set release dates: only when detail panel opens (not on every page load)
  const setsLoadedRef = useRef(false);
  useEffect(() => {
    if (!panelOpen || setsLoadedRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/sets?lang=${DEFAULT_LANGUAGE}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          data?: Array<{ id?: string; releaseDate?: string; name?: string }>;
        };
        const byId: Record<string, string> = {};
        const byName: Record<string, string> = {};
        for (const s of data.data ?? []) {
          if (!s.releaseDate) continue;
          if (s.id) byId[s.id] = s.releaseDate;
          if (s.name) byName[s.name.toLowerCase()] = s.releaseDate;
        }
        if (!cancelled) {
          setsLoadedRef.current = true;
          setSetReleaseById({ ...byName, ...byId });
        }
      } catch {
        /* ignore — detail shows — */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [panelOpen]);

  const toggleRowExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setRowChecked = (id: string, on: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const { requireAuth, AuthPromptModal } = useRequireAuth({
    title: "Sammlung verwalten",
    description:
      "Karten aus der Datenbank landen in deiner Sammlung. Mit Konto werden sie serverseitig gespeichert.",
  });

  const loadLocal = useCallback(() => {
    if (isAuthenticated) {
      setLocalItems([]);
      return;
    }
    setLocalItems(getLocalCollection());
  }, [isAuthenticated]);

  const loadCollection = useCallback(
    async (force = false) => {
      if (authLoading) return;

      if (!isAuthenticated) {
        setItems([]);
        setMetrics(null);
        loadLocal();
        setLoading(false);
        return;
      }

      setLocalItems([]);
      // Warm cache → show immediately, no full-page spinner
      if (!force) {
        const warm = peekCollectionCache();
        if (warm) {
          const loaded = (warm.items as CollectionItemDto[]) ?? [];
          setItems(loaded);
          setMetrics((warm.metrics as CollectionMetrics | null) ?? null);
          setSelectedId((current) => current ?? loaded[0]?.id ?? null);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }

      try {
        const data = await fetchCollectionCached(force);
        if (!data) {
          if (!peekCollectionCache()) {
            setItems([]);
            setMetrics(null);
          }
          return;
        }
        const loaded: CollectionItemDto[] = (data.items as CollectionItemDto[]) ?? [];
        setItems(loaded);
        setMetrics((data.metrics as CollectionMetrics | null) ?? null);
        setSelectedId((current) => current ?? loaded[0]?.id ?? null);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, authLoading, loadLocal],
  );

  useEffect(() => {
    void loadCollection(false);
    const onLocal = () => {
      if (!isAuthenticated) loadLocal();
      else {
        invalidateCollectionCache();
        void loadCollection(true);
      }
    };
    window.addEventListener("cardcap-collection-changed", onLocal);
    window.addEventListener("storage", onLocal);
    return () => {
      window.removeEventListener("cardcap-collection-changed", onLocal);
      window.removeEventListener("storage", onLocal);
    };
  }, [loadCollection, loadLocal, isAuthenticated]);

  // Restore filters / page size after mount (SSR-safe). Search is never restored.
  useEffect(() => {
    const saved = loadKartenUi();
    setSearch(""); // always clear search when entering the page
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

  // Clear search when leaving Assets → Karten (soft navigation)
  useEffect(() => {
    return () => {
      setSearch("");
    };
  }, []);

  // Persist filters (without search) so other prefs survive reload
  useEffect(() => {
    if (!uiReady || typeof window === "undefined") return;
    const payload: KartenUiState = {
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

  // Logged in → only DB. Demo → only localStorage.
  const displayItems: DisplayRow[] = useMemo(() => {
    if (isAuthenticated) return items.map(mapApiItem);
    return localItems.map(mapLocalItem);
  }, [items, localItems, isAuthenticated]);

  const setOptions = useMemo(() => {
    const names = [...new Set(displayItems.map((i) => i.setName).filter(Boolean))];
    names.sort((a, b) => a.localeCompare(b, "de"));
    return names;
  }, [displayItems]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    // 1) Filter flat storage rows (condition filter: keep row if it matches)
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

    // When filtering by condition, also pull sibling conditions of the same card
    // so the group still shows under one header (only if not filtering by condition)
    // — if user filters NM, only NM copies appear (as a group if multi NM).

    // 2) Group different conditions of same tcgCard into one expandable row
    if (conditionFilter === "Alle Zustände") {
      // Include all condition-siblings even if only some matched other filters
      const matchedKeys = new Set(
        rows.map((r) => r.tcgCardId || r.id),
      );
      rows = displayItems.filter((row) => {
        const key = row.tcgCardId || row.id;
        if (!matchedKeys.has(key)) return false;
        // re-apply non-condition filters
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
        if (!matchesAssetsRarityFilter(row.rarity, rarityFilter)) return false;
        return true;
      });
    }

    rows = groupByTcgCard(rows);

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "name-desc":
          return b.name.localeCompare(a.name, "de");
        case "value-desc":
          return b.marketValue - a.marketValue;
        case "value-asc":
          return a.marketValue - b.marketValue;
        case "profit-desc":
          return b.profit - a.profit;
        case "profit-asc":
          return a.profit - b.profit;
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

  /** Drop checks that are no longer in the filtered list */
  useEffect(() => {
    setCheckedIds((prev) => {
      if (prev.size === 0) return prev;
      const allowed = new Set(filteredItems.map((r) => r.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredItems]);

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((r) => checkedIds.has(r.id));
  const someFilteredSelected =
    !allFilteredSelected && filteredItems.some((r) => checkedIds.has(r.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredItems.map((r) => r.id)));
    }
  };

  const selectAllHeaderRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = selectAllHeaderRef.current;
    if (el) el.indeterminate = someFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected]);

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
    const invested = displayItems.reduce((s, i) => {
      if (i.exemplars && i.exemplars.length > 0) {
        return (
          s +
          i.exemplars.reduce((a, e) => a + (e.purchasePrice ?? 0), 0)
        );
      }
      return s + i.purchasePrice * i.quantity;
    }, 0);
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

  const formatPriceInput = (n: number | null | undefined) =>
    n != null ? n.toFixed(2).replace(".", ",") : "";

  const startEdit = useCallback(() => {
    if (!selectedRow) return;
    const qty = Math.max(1, selectedRow.quantity);
    const ex =
      selectedRow.exemplars && selectedRow.exemplars.length === qty
        ? selectedRow.exemplars
        : null;
    const priceStr = formatPriceInput(selectedRow.purchasePrice);
    setEditQty(qty);
    setEditCondition(selectedRow.condition);
    setEditConditions(
      ex
        ? ex.map((e) => e.condition || selectedRow.condition || "Near Mint")
        : Array.from(
            { length: qty },
            () => selectedRow.condition || "Near Mint",
          ),
    );
    setEditPrices(
      ex
        ? ex.map((e) => formatPriceInput(e.purchasePrice))
        : Array.from({ length: qty }, () => priceStr),
    );
    const dateStr = toDateInputValue(selectedRow.purchaseDate);
    setEditDates(
      ex
        ? ex.map((e) => toDateInputValue(e.purchaseDate ?? dateStr))
        : Array.from({ length: qty }, () => dateStr),
    );
    setEditPrice(priceStr);
    setEditDate(dateStr);
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
    setEditPrices((prev) => {
      if (qty === prev.length) return prev;
      if (qty < prev.length) return prev.slice(0, qty);
      const fill = prev[prev.length - 1] || editPrice || "";
      return [...prev, ...Array.from({ length: qty - prev.length }, () => fill)];
    });
    setEditDates((prev) => {
      if (qty === prev.length) return prev;
      if (qty < prev.length) return prev.slice(0, qty);
      const fill = prev[prev.length - 1] || editDate || "";
      return [...prev, ...Array.from({ length: qty - prev.length }, () => fill)];
    });
  };

  const setExemplarCondition = (index: number, condition: string) => {
    setEditConditions((prev) => {
      const next = [...prev];
      next[index] = condition;
      return next;
    });
    if (editQty === 1) setEditCondition(condition);
  };

  const setExemplarPrice = (index: number, value: string) => {
    setEditPrices((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (editQty === 1) setEditPrice(value);
  };

  const setExemplarDate = (index: number, value: string) => {
    setEditDates((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (editQty === 1) setEditDate(value);
  };

  const saveEdit = useCallback(async () => {
    if (!selectedRow) return;
    setSaving(true);
    try {
      const purchaseDate = editDate.trim() || null;
      const quantity = Math.max(1, Math.floor(editQty) || 1);
      const perCopy = Array.from({ length: quantity }, (_, i) => ({
        condition:
          editConditions[i] || editCondition || "Near Mint",
        purchasePrice: parseEuroInput(
          editPrices[i] ?? editPrice ?? "",
        ),
        purchaseDate:
          (editDates[i] ?? editDate ?? "").trim() || purchaseDate,
      }));
      const conditions = perCopy.map((c) => c.condition);
      const prices = perCopy.map((c) => c.purchasePrice);
      const dates = perCopy.map((c) => c.purchaseDate ?? null);
      const uniqueConditions = new Set(conditions);
      const uniquePrices = new Set(prices.map((p) => p ?? "null"));
      const uniqueDates = new Set(dates.map((d) => d ?? "null"));
      const needsSplit =
        uniqueConditions.size > 1 ||
        uniquePrices.size > 1 ||
        uniqueDates.size > 1;

      const singlePrice = prices[0] ?? parseEuroInput(editPrice);

      const memberIds =
        selectedRow.groupMemberIds && selectedRow.groupMemberIds.length > 0
          ? selectedRow.groupMemberIds
          : [selectedRow.id];
      const isLocalGroup =
        memberIds.every((id) => isLocalRow(id)) || !isAuthenticated;

      if (isLocalGroup) {
        const template =
          getLocalCollection().find((i) => memberIds.includes(i.id)) ??
          getLocalCollection().find(
            (i) => i.tcgCardId === selectedRow.tcgCardId,
          );
        if (template && (needsSplit || quantity > 1 || memberIds.length > 1)) {
          replaceLocalCollectionForCard(template, perCopy, {
            removeIds: memberIds,
            purchaseDate,
          });
        } else if (template) {
          updateLocalCollectionItem(memberIds[0], {
            quantity,
            condition: conditions[0] || "Near Mint",
            purchasePrice: singlePrice,
            purchaseDate,
          });
        } else {
          replaceLocalCollectionByCopies(selectedRow.id, perCopy, purchaseDate);
        }
        loadLocal();
        setEditing(false);
        return;
      }

      if (needsSplit || quantity > 1 || memberIds.length > 1) {
        // Remove every storage row of this card, then re-add by condition
        for (const mid of memberIds) {
          await fetch("/api/collection", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: mid }),
          });
        }
        const byCond = new Map<string, number[]>();
        for (const c of perCopy) {
          const list = byCond.get(c.condition) ?? [];
          list.push(c.purchasePrice ?? 0);
          byCond.set(c.condition, list);
        }
        for (const [condition, priceList] of byCond) {
          const qty = priceList.length;
          const avg =
            Math.round(
              (priceList.reduce((s, p) => s + p, 0) / qty) * 100,
            ) / 100;
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
                  purchasePrice: avg,
                  purchaseDate,
                }),
              });
            }
          }
        }
        const localTemplate = getLocalCollection().find(
          (i) => i.tcgCardId === selectedRow.tcgCardId,
        );
        if (localTemplate) {
          replaceLocalCollectionForCard(localTemplate, perCopy, {
            purchaseDate,
          });
        }
        invalidateCollectionCache();
      await loadCollection(true);
        setEditing(false);
        return;
      }

      const condition = conditions[0] || "Near Mint";
      const res = await fetch("/api/collection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRow.id,
          quantity,
          condition,
          purchasePrice: singlePrice,
          purchaseDate,
        }),
      });
      if (!res.ok) {
        updateLocalCollectionItem(selectedRow.id, {
          quantity,
          condition,
          purchasePrice: singlePrice,
          purchaseDate,
        });
      }
      invalidateCollectionCache();
      await loadCollection(true);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [
    selectedRow,
    editPrice,
    editPrices,
    editDate,
    editDates,
    editQty,
    editCondition,
    editConditions,
    isAuthenticated,
    loadLocal,
    loadCollection,
  ]);

  const deleteMemberIds = useCallback(
    async (memberIds: string[]) => {
      const allLocal =
        memberIds.every((id) => isLocalRow(id)) || !isAuthenticated;
      if (allLocal) {
        for (const mid of memberIds) {
          removeLocalCollectionItem(mid);
        }
        loadLocal();
        return;
      }
      for (const mid of memberIds) {
        const res = await fetch("/api/collection", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mid }),
        });
        if (!res.ok) {
          removeLocalCollectionItem(mid);
        }
      }
      loadLocal();
      invalidateCollectionCache();
      await loadCollection(true);
    },
    [isAuthenticated, loadLocal, loadCollection],
  );

  const removeSelected = useCallback(async () => {
    if (!selectedRow) return;
    const memberIds =
      selectedRow.groupMemberIds && selectedRow.groupMemberIds.length > 0
        ? selectedRow.groupMemberIds
        : [selectedRow.id];
    const ok = window.confirm(
      memberIds.length > 1
        ? `„${selectedRow.name}“ mit allen ${selectedRow.quantity} Exemplaren aus der Sammlung entfernen?`
        : `„${selectedRow.name}“ aus der Sammlung entfernen?`,
    );
    if (!ok) return;

    setSaving(true);
    try {
      await deleteMemberIds(memberIds);
      setEditing(false);
      setPanelOpen(false);
      setSelectedId(null);
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedRow.id);
        return next;
      });
    } finally {
      setSaving(false);
    }
  }, [selectedRow, deleteMemberIds]);

  const removeChecked = useCallback(async () => {
    if (checkedIds.size === 0) return;
    const rows = filteredItems.filter((r) => checkedIds.has(r.id));
    if (rows.length === 0) return;
    const exemplare = rows.reduce((s, r) => s + r.quantity, 0);
    const ok = window.confirm(
      rows.length === 1
        ? `„${rows[0].name}“ aus der Sammlung entfernen?`
        : `${rows.length} Karten (${exemplare} Exemplare) aus der Sammlung entfernen?`,
    );
    if (!ok) return;

    setBulkDeleting(true);
    try {
      const allMemberIds: string[] = [];
      for (const row of rows) {
        if (row.groupMemberIds && row.groupMemberIds.length > 0) {
          allMemberIds.push(...row.groupMemberIds);
        } else {
          allMemberIds.push(row.id);
        }
      }
      await deleteMemberIds([...new Set(allMemberIds)]);
      setCheckedIds(new Set());
      if (selectedId && checkedIds.has(selectedId)) {
        setPanelOpen(false);
        setSelectedId(null);
        setEditing(false);
      }
    } finally {
      setBulkDeleting(false);
    }
  }, [checkedIds, filteredItems, deleteMemberIds, selectedId]);

  const updateCheckedPurchaseDate = useCallback(
    async (isoDate: string) => {
      if (checkedIds.size === 0 || !isoDate) return;
      const rows = filteredItems.filter((r) => checkedIds.has(r.id));
      if (rows.length === 0) return;

      setBulkDeleting(true);
      try {
        const memberIds: string[] = [];
        for (const row of rows) {
          if (row.groupMemberIds && row.groupMemberIds.length > 0) {
            memberIds.push(...row.groupMemberIds);
          } else {
            memberIds.push(row.id);
          }
        }
        const unique = [...new Set(memberIds)];
        for (const mid of unique) {
          if (isLocalRow(mid) || !isAuthenticated) {
            updateLocalCollectionItem(mid, { purchaseDate: isoDate });
          } else {
            const res = await fetch("/api/collection", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: mid, purchaseDate: isoDate }),
            });
            if (!res.ok) {
              updateLocalCollectionItem(mid, { purchaseDate: isoDate });
            }
          }
        }
        loadLocal();
        if (isAuthenticated) invalidateCollectionCache();
      await loadCollection(true);
      } finally {
        setBulkDeleting(false);
      }
    },
    [
      checkedIds,
      filteredItems,
      isAuthenticated,
      loadLocal,
      loadCollection,
    ],
  );

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
        onImported={() => {
          invalidateCollectionCache();
          void loadCollection(true);
        }}
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

          {/* Metrics: value KPIs first, then counts */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
              <option value="name-desc">Name Z–A</option>
              <option value="set">Set / Nummer</option>
              <option value="value-desc">Marktwert: höchster zuerst</option>
              <option value="value-asc">Marktwert: niedrigster zuerst</option>
              <option value="profit-desc">Gewinn: höchster zuerst</option>
              <option value="profit-asc">Gewinn: niedrigster zuerst</option>
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
              <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                {filteredItems.length > 0 && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected;
                      }}
                      onChange={toggleSelectAllFiltered}
                      className="h-3.5 w-3.5 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      aria-label="Alle gefilterten Karten auswählen"
                    />
                    Alle auswählen
                  </label>
                )}
                <p>
                  {filteredStats.cards.toLocaleString("de-DE")} Karten
                  <span className="mx-1.5 opacity-40">·</span>
                  {filteredStats.exemplare.toLocaleString("de-DE")} Exemplare
                  <span className="mx-1.5 opacity-40">·</span>
                  Marktwert {formatMarketPrice(filteredStats.value)}
                </p>
              </div>
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
                      const isChecked = checkedIds.has(row.id);
                      return (
                        <div
                          key={row.id}
                          className={`relative rounded-xl border p-2.5 text-left transition-colors ${
                            isChecked
                              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                              : isSelected
                                ? "border-[var(--accent)]/60 bg-[var(--surface)]"
                                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                          }`}
                        >
                          <label
                            className="absolute left-2 top-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[var(--surface)]/90 shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setRowChecked(row.id, e.target.checked)
                              }
                              className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                              aria-label={`${row.name} auswählen`}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(row.id);
                              setPanelOpen(true);
                            }}
                            className="w-full text-left"
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
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="space-y-3 lg:hidden">
                      {pageItems.map((row) => {
                        const isSelected = panelOpen && row.id === activeId;
                        const isChecked = checkedIds.has(row.id);
                        const profitClass =
                          row.profit > 0
                            ? "text-[var(--positive)]"
                            : row.profit < 0
                              ? "text-[var(--negative)]"
                              : "text-[var(--muted)]";
                        return (
                          <div
                            key={row.id}
                            className={`w-full rounded-xl border p-3 transition-colors touch-manipulation ${
                              isChecked
                                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                                : isSelected
                                  ? "border-[var(--accent)]/60 bg-[var(--surface)]"
                                  : "border-[var(--border)] bg-[var(--surface)]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <label
                                className="flex shrink-0 items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) =>
                                    setRowChecked(row.id, e.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                                  aria-label={`${row.name} auswählen`}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedId(row.id);
                                  setPanelOpen(true);
                                }}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <CardImage
                                  src={row.imageUrl}
                                  fallbacks={row.imageFallbacks}
                                  alt={row.name}
                                  size="sm"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">
                                    {row.name}
                                  </p>
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
                                    className={`tabular-nums text-xs font-medium ${profitClass}`}
                                  >
                                    {row.profit > 0 ? "+" : ""}
                                    <Price
                                      value={row.profit}
                                      className={profitClass}
                                    />
                                  </p>
                                </div>
                              </button>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs pl-7">
                              <ConditionBadge condition={row.condition} />
                              <span className="text-[var(--muted)]">
                                ×{row.quantity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop table — border-separate so accent frames on cells work */}
                    <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:block">
                      <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
                            <th className="w-10 px-2 py-3 text-center align-middle font-medium">
                              <input
                                ref={selectAllHeaderRef}
                                type="checkbox"
                                checked={allFilteredSelected}
                                onChange={toggleSelectAllFiltered}
                                className="mx-auto block h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                                aria-label="Alle markierten Filter-Karten auswählen"
                                title={
                                  allFilteredSelected
                                    ? "Auswahl aufheben"
                                    : "Alle gefilterten Karten auswählen"
                                }
                              />
                            </th>
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
                            const multi = row.quantity > 1;
                            const expanded = expandedRows.has(row.id);
                            const openRow = () => {
                              setSelectedId(row.id);
                              setPanelOpen(true);
                            };

                            /**
                             * Borders on <td> so the frame paints fully.
                             * role "header" = main card row (stronger highlight when open)
                             */
                            const frameTd = (
                              col: "first" | "mid" | "last",
                              edge: "top" | "mid" | "bottom",
                              extra = "",
                              role: "header" | "child" = "child",
                            ) => {
                              if (!expanded) return extra;
                              const parts = [
                                extra,
                                "border-[var(--accent)]",
                                role === "header"
                                  ? "bg-[var(--surface-elevated)]"
                                  : "bg-[var(--background)]/90",
                              ];
                              if (col === "first") parts.push("border-l");
                              if (col === "last") parts.push("border-r");
                              if (edge === "top") parts.push("border-t");
                              if (edge === "bottom") parts.push("border-b");
                              if (edge === "top" && col === "first")
                                parts.push("rounded-tl-lg");
                              if (edge === "top" && col === "last")
                                parts.push("rounded-tr-lg");
                              if (edge === "bottom" && col === "first")
                                parts.push("rounded-bl-lg");
                              if (edge === "bottom" && col === "last")
                                parts.push("rounded-br-lg");
                              if (edge === "mid" || edge === "bottom")
                                parts.push("border-t border-t-[var(--accent)]/30");
                              return parts.filter(Boolean).join(" ");
                            };

                            // Unique conditions among exemplars (for badge)
                            const conditionSet = new Set(
                              (row.exemplars?.length
                                ? row.exemplars.map((e) => e.condition)
                                : [row.condition]
                              ).filter(Boolean),
                            );
                            const conditionCount = Math.max(
                              1,
                              conditionSet.size,
                            );

                            const isChecked = checkedIds.has(row.id);

                            return (
                              <Fragment key={row.id}>
                                <tr
                                  onClick={openRow}
                                  className={`cursor-pointer transition-colors ${
                                    !expanded
                                      ? `border-b border-[var(--border)] last:border-0 ${
                                          isChecked || isSelected
                                            ? "bg-[var(--accent-soft)]"
                                            : "hover:bg-[var(--surface-elevated)]"
                                        }`
                                      : "hover:brightness-110"
                                  }`}
                                >
                                  <td
                                    className={frameTd(
                                      "first",
                                      expanded ? "top" : "mid",
                                      "w-10 px-2 py-3 text-center align-middle",
                                      "header",
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) =>
                                        setRowChecked(row.id, e.target.checked)
                                      }
                                      className="mx-auto block h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                                      aria-label={`${row.name} auswählen`}
                                    />
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3",
                                      "header",
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      {multi ? (
                                        <button
                                          type="button"
                                          aria-expanded={expanded}
                                          aria-label={
                                            expanded
                                              ? "Exemplare einklappen"
                                              : "Exemplare ausklappen"
                                          }
                                          onClick={(e) =>
                                            toggleRowExpand(row.id, e)
                                          }
                                          className="mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
                                        >
                                          <span
                                            className={`inline-block text-xl font-semibold leading-none transition-transform ${
                                              expanded ? "rotate-90" : ""
                                            }`}
                                            aria-hidden
                                          >
                                            ›
                                          </span>
                                        </button>
                                      ) : (
                                        <span className="w-9 shrink-0" />
                                      )}
                                      <CardImage
                                        src={row.imageUrl}
                                        fallbacks={row.imageFallbacks}
                                        alt={row.name}
                                        size="sm"
                                      />
                                      <div className="min-w-0 pl-0.5">
                                        <span className="font-medium">
                                          {row.name}
                                        </span>
                                        {multi && (
                                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                                            {row.quantity} Exemplare
                                            {conditionCount > 1 && (
                                              <span className="ml-1.5 inline-flex rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                                                {conditionCount} Zustände
                                              </span>
                                            )}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3 text-[var(--muted)]",
                                      "header",
                                    )}
                                  >
                                    <div className="leading-snug">
                                      <p className="text-[var(--foreground)]">
                                        {row.setName || "—"}
                                      </p>
                                      {row.number && (
                                        <p className="text-xs">{row.number}</p>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3 text-sm text-[var(--muted)]",
                                      "header",
                                    )}
                                  >
                                    {rarityLabel}
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3 tabular-nums text-[var(--muted)]",
                                      "header",
                                    )}
                                  >
                                    {languageShort(row.language)}
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3",
                                      "header",
                                    )}
                                  >
                                    {conditionCount > 1 ? (
                                      <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                                        {conditionCount} Zustände
                                      </span>
                                    ) : (
                                      <ConditionBadge
                                        condition={row.condition}
                                      />
                                    )}
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3 text-right tabular-nums",
                                      "header",
                                    )}
                                  >
                                    {row.quantity}
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3 text-right tabular-nums text-[var(--muted)]",
                                      "header",
                                    )}
                                  >
                                    {expanded
                                      ? `Ø ${formatCurrency(row.purchasePrice)}`
                                      : formatCurrency(row.purchasePrice)}
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3 text-right tabular-nums",
                                      "header",
                                    )}
                                  >
                                    {expanded ? (
                                      <span className="tabular-nums">
                                        Ø <Price value={unitMarket} />
                                      </span>
                                    ) : (
                                      <Price value={unitMarket} />
                                    )}
                                  </td>
                                  <td
                                    className={frameTd(
                                      "mid",
                                      expanded ? "top" : "mid",
                                      "px-3 py-3 text-right tabular-nums font-medium",
                                      "header",
                                    )}
                                  >
                                    <Price value={row.marketValue} />
                                  </td>
                                  <td
                                    className={frameTd(
                                      "last",
                                      expanded ? "top" : "mid",
                                      `px-3 py-3 text-right tabular-nums font-medium ${profitClass}`,
                                      "header",
                                    )}
                                  >
                                    {row.profit > 0 ? "+" : ""}
                                    <Price
                                      value={row.profit}
                                      className={profitClass}
                                    />
                                  </td>
                                </tr>
                                {multi &&
                                  expanded &&
                                  (() => {
                                    const sortedEx = (
                                      row.exemplars && row.exemplars.length > 0
                                        ? [...row.exemplars]
                                        : Array.from(
                                            { length: row.quantity },
                                            () => ({
                                              condition: row.condition,
                                              purchasePrice: row.purchasePrice,
                                              purchaseDate: row.purchaseDate,
                                            }),
                                          )
                                    ).sort(
                                      (a, b) =>
                                        conditionRank(
                                          a.condition || "Near Mint",
                                        ) -
                                        conditionRank(
                                          b.condition || "Near Mint",
                                        ),
                                    );
                                    return sortedEx.map((ex, i) => {
                                      const exCondition =
                                        ex.condition || row.condition;
                                      const exEk =
                                        ex.purchasePrice ?? row.purchasePrice;
                                      const unitProfit =
                                        Math.round(
                                          (unitMarket - (exEk ?? 0)) * 100,
                                        ) / 100;
                                      const exProfitClass =
                                        unitProfit > 0
                                          ? "text-[var(--positive)]"
                                          : unitProfit < 0
                                            ? "text-[var(--negative)]"
                                            : "text-[var(--muted)]";
                                      const isLast = i === sortedEx.length - 1;
                                      const edge = isLast ? "bottom" : "mid";
                                      return (
                                        <tr
                                          key={`${row.id}-ex-${i}-${exCondition}`}
                                          onClick={openRow}
                                          className="cursor-pointer text-sm transition-colors hover:bg-[var(--accent-soft)]/40"
                                        >
                                          <td
                                            className={frameTd(
                                              "first",
                                              edge,
                                              "w-10 px-2 py-2.5 text-center align-middle",
                                              "child",
                                            )}
                                          />
                                          <td
                                            className={frameTd(
                                              "mid",
                                              edge,
                                              "px-3 py-2.5 pl-12",
                                              "child",
                                            )}
                                            colSpan={2}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-medium text-[var(--muted)]">
                                                Exemplar {i + 1}
                                              </span>
                                              <ConditionBadge
                                                condition={exCondition}
                                                short
                                              />
                                            </div>
                                          </td>
                                          <td
                                            className={frameTd(
                                              "mid",
                                              edge,
                                              "px-3 py-2.5 text-[var(--muted)]",
                                              "child",
                                            )}
                                          >
                                            {rarityLabel}
                                          </td>
                                          <td
                                            className={frameTd(
                                              "mid",
                                              edge,
                                              "px-3 py-2.5 text-[var(--muted)]",
                                              "child",
                                            )}
                                          >
                                            {languageShort(row.language)}
                                          </td>
                                          <td
                                            className={frameTd(
                                              "mid",
                                              edge,
                                              "px-3 py-2.5",
                                              "child",
                                            )}
                                          >
                                            <ConditionBadge
                                              condition={exCondition}
                                              short
                                            />
                                          </td>
                                          <td
                                            className={frameTd(
                                              "mid",
                                              edge,
                                              "px-3 py-2.5 text-right tabular-nums text-[var(--muted)]",
                                              "child",
                                            )}
                                          >
                                            1
                                          </td>
                                          <td
                                            className={frameTd(
                                              "mid",
                                              edge,
                                              "px-3 py-2.5 text-right tabular-nums text-[var(--muted)]",
                                              "child",
                                            )}
                                          >
                                            {formatCurrency(exEk ?? 0)}
                                          </td>
                                          <td
                                            className={frameTd(
                                              "mid",
                                              edge,
                                              "px-3 py-2.5 text-right tabular-nums",
                                              "child",
                                            )}
                                          >
                                            <Price value={unitMarket} />
                                          </td>
                                          <td
                                            className={frameTd(
                                              "mid",
                                              edge,
                                              "px-3 py-2.5 text-right tabular-nums",
                                              "child",
                                            )}
                                          >
                                            <Price value={unitMarket} />
                                          </td>
                                          <td
                                            className={frameTd(
                                              "last",
                                              edge,
                                              `px-3 py-2.5 text-right tabular-nums ${exProfitClass}`,
                                              "child",
                                            )}
                                          >
                                            {unitProfit > 0 ? "+" : ""}
                                            <Price
                                              value={unitProfit}
                                              className={exProfitClass}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                              </Fragment>
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
                    {checkedIds.size > 0 && (
                      <span className="ml-2 text-[var(--accent)]">
                        · {checkedIds.size.toLocaleString("de-DE")} ausgewählt
                      </span>
                    )}
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
          setDetail={rowToSetDetail(selectedRow, setReleaseById)}
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
            const idx = filteredItems.findIndex(
              (r) => r.id === selectedRow.id,
            );
            if (idx > 0) {
              setSelectedId(filteredItems[idx - 1].id);
              setPanelOpen(true);
            }
          }}
          onNext={() => {
            const idx = filteredItems.findIndex(
              (r) => r.id === selectedRow.id,
            );
            if (idx >= 0 && idx < filteredItems.length - 1) {
              setSelectedId(filteredItems[idx + 1].id);
              setPanelOpen(true);
            }
          }}
          hasPrev={
            filteredItems.findIndex((r) => r.id === selectedRow.id) > 0
          }
          hasNext={(() => {
            const idx = filteredItems.findIndex(
              (r) => r.id === selectedRow.id,
            );
            return idx >= 0 && idx < filteredItems.length - 1;
          })()}
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
            exemplars: (selectedRow.exemplars ?? []).map((e) => ({
              condition: e.condition || selectedRow.condition,
              purchasePrice: e.purchasePrice,
              purchaseDate: e.purchaseDate ?? selectedRow.purchaseDate,
            })),
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
                  <>
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
                    <label className="flex flex-col gap-1">
                      <span className="text-[var(--muted)]">
                        EK pro Karte (€)
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editPrices[0] ?? editPrice}
                        onChange={(e) => {
                          setEditPrice(e.target.value);
                          setEditPrices([e.target.value]);
                        }}
                        placeholder="0,00"
                        className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[var(--muted)]">Kaufdatum</span>
                      <input
                        type="date"
                        value={editDates[0] ?? editDate}
                        onChange={(e) => {
                          setEditDate(e.target.value);
                          setEditDates([e.target.value]);
                        }}
                        className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3"
                      />
                    </label>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[var(--muted)]">
                        Zustand, EK &amp; Kaufdatum pro Exemplar
                      </span>
                      <div className="flex flex-wrap gap-2">
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
                          Zustand für alle
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
                          onClick={() => {
                            const all = editPrices[0] || editPrice || "";
                            setEditPrices(
                              Array.from({ length: editQty }, () => all),
                            );
                            setEditPrice(all);
                          }}
                        >
                          EK für alle
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
                          onClick={() => {
                            const all = editDates[0] || editDate || "";
                            setEditDates(
                              Array.from({ length: editQty }, () => all),
                            );
                            setEditDate(all);
                          }}
                        >
                          Datum für alle
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Unterschiedliche Zustände werden als getrennte Einträge
                      gespeichert. EK und Kaufdatum gelten je Exemplar.
                    </p>
                    <ul className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
                      {Array.from({ length: editQty }, (_, i) => (
                        <li
                          key={i}
                          className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-2"
                        >
                          <span className="text-xs font-medium text-[var(--muted)]">
                            Exemplar {i + 1}
                          </span>
                          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                            <select
                              value={
                                editConditions[i] ||
                                editCondition ||
                                "Near Mint"
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
                            <label className="flex min-w-0 flex-1 items-center gap-1.5">
                              <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                EK €
                              </span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editPrices[i] ?? ""}
                                onChange={(e) =>
                                  setExemplarPrice(i, e.target.value)
                                }
                                placeholder="0,00"
                                className="h-9 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm tabular-nums"
                              />
                            </label>
                            <label className="flex min-w-0 flex-1 items-center gap-1.5">
                              <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                Kauf
                              </span>
                              <input
                                type="date"
                                value={editDates[i] ?? ""}
                                onChange={(e) =>
                                  setExemplarDate(i, e.target.value)
                                }
                                className="h-9 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                              />
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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

      <BulkActionBar
        selectedCount={checkedIds.size}
        totalCount={filteredItems.length}
        allSelected={allFilteredSelected}
        busy={bulkDeleting}
        onSelectAll={toggleSelectAllFiltered}
        onClear={() => setCheckedIds(new Set())}
        onDelete={() => void removeChecked()}
        onPurchaseDate={(d) => updateCheckedPurchaseDate(d)}
      />
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