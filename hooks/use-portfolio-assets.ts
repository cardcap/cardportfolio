"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import {
  getLocalCollection,
  type LocalCollectionItem,
} from "@/lib/local-collection";
import {
  getLocalSealed,
  SEALED_CHANGED_EVENT,
} from "@/lib/local-sealed";
import type { SealedProduct } from "@/lib/mock-data";

export type LivePosition = {
  id: string;
  name: string;
  setId?: string;
  setName: string;
  kind: "Karte" | "Sealed";
  market: number;
  invested: number;
  quantity: number;
  imageUrl?: string;
  imageFallbacks?: string[];
  condition?: string;
  language?: string;
  purchaseDate?: string | null;
  returnPct: number;
  href: string;
};

export type LiveAllocSegment = {
  label: string;
  percent: number;
  color: string;
  value: number;
};

export type LiveHistoryPoint = {
  date: string;
  label: string;
  value: number;
  cards: number;
  sealed: number;
  market: number;
  invested: number;
};

export type LivePortfolioSnapshot = {
  loading: boolean;
  cardsValue: number;
  cardsInvested: number;
  cardsCount: number;
  cardsUnique: number;
  sealedValue: number;
  sealedInvested: number;
  sealedProducts: number;
  sealedUnits: number;
  totalValue: number;
  invested: number;
  unrealized: number;
  returnRate: number;
  positions: LivePosition[];
  topPositions: LivePosition[];
  bestReturn: LivePosition | null;
  worstReturn: LivePosition | null;
  allocation: LiveAllocSegment[];
  /** Daily series ending at live totals (no mock portfolio). */
  history: LiveHistoryPoint[];
  setGroups: {
    setId: string;
    setName: string;
    owned: number;
    value: number;
  }[];
  allocationBy: {
    assetType: LiveAllocSegment[];
    set: LiveAllocSegment[];
    language: LiveAllocSegment[];
    condition: LiveAllocSegment[];
  };
  refresh: () => void;
};

type ApiCollectionItem = {
  id: string;
  name: string;
  setId?: string;
  setName?: string;
  quantity: number;
  marketValue: number;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  imageUrl?: string;
  imageFallbacks?: string[];
  condition?: string;
  language?: string;
  exemplars?: Array<{ purchasePrice?: number | null }>;
};

type ApiSealedItem = {
  id: string;
  name: string;
  setId?: string | null;
  setName?: string;
  quantity: number;
  marketValue: number;
  purchasePrice: number;
  purchaseDate?: string | null;
  imageUrl?: string;
  imageFallbacks?: string[];
  condition?: string;
  language?: string;
  category?: string;
};

const ALLOC_COLORS = [
  "#f472b6",
  "#a78bfa",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#818cf8",
  "#2dd4bf",
];

function investedFromCollectionItem(item: {
  quantity: number;
  purchasePrice?: number | null;
  exemplars?: Array<{ purchasePrice?: number | null }>;
}): number {
  if (item.exemplars && item.exemplars.length > 0) {
    return item.exemplars.reduce((s, e) => s + (e.purchasePrice ?? 0), 0);
  }
  return (item.purchasePrice ?? 0) * Math.max(1, item.quantity);
}

function posFromCard(item: ApiCollectionItem | LocalCollectionItem): LivePosition {
  const market = item.marketValue ?? 0;
  const invested = investedFromCollectionItem(item);
  const returnPct =
    invested > 0 ? ((market - invested) / invested) * 100 : market > 0 ? 100 : 0;
  return {
    id: item.id,
    name: item.name,
    setId: "setId" in item ? item.setId : undefined,
    setName: item.setName ?? "",
    kind: "Karte",
    market: Math.round(market * 100) / 100,
    invested: Math.round(invested * 100) / 100,
    quantity: item.quantity,
    imageUrl: item.imageUrl,
    imageFallbacks: item.imageFallbacks,
    condition: item.condition,
    language: "language" in item ? item.language : undefined,
    purchaseDate: "purchaseDate" in item ? item.purchaseDate : null,
    returnPct: Math.round(returnPct * 10) / 10,
    href: "/assets/karten",
  };
}

function posFromSealed(item: SealedProduct | ApiSealedItem): LivePosition {
  const qty = Math.max(1, item.quantity);
  const market = (item.marketValue ?? 0) * qty;
  const invested = (item.purchasePrice ?? 0) * qty;
  const returnPct =
    invested > 0 ? ((market - invested) / invested) * 100 : market > 0 ? 100 : 0;
  return {
    id: item.id,
    name: item.name,
    setId: "setId" in item ? (item.setId ?? undefined) : undefined,
    setName: item.setName ?? "",
    kind: "Sealed",
    market: Math.round(market * 100) / 100,
    invested: Math.round(invested * 100) / 100,
    quantity: qty,
    imageUrl: item.imageUrl,
    imageFallbacks: item.imageFallbacks,
    condition: item.condition,
    language: "language" in item ? item.language : undefined,
    purchaseDate: "purchaseDate" in item ? item.purchaseDate ?? null : null,
    returnPct: Math.round(returnPct * 10) / 10,
    href: "/assets/sealed",
  };
}

function groupAllocation(
  rows: { label: string; value: number }[],
  totalValue: number,
): LiveAllocSegment[] {
  if (totalValue <= 0 || rows.length === 0) return [];
  const sorted = [...rows]
    .filter((r) => r.value > 0 && r.label)
    .sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const restValue = rest.reduce((s, r) => s + r.value, 0);
  const segments = top.map((r, i) => ({
    label: r.label,
    value: round2(r.value),
    percent: Math.round((r.value / totalValue) * 1000) / 10,
    color: ALLOC_COLORS[i % ALLOC_COLORS.length],
  }));
  if (restValue > 0) {
    segments.push({
      label: "Sonstige",
      value: round2(restValue),
      percent: Math.round((restValue / totalValue) * 1000) / 10,
      color: "#71717a",
    });
  }
  return segments;
}

/**
 * Synthetic daily history ending at current live totals.
 * No mock portfolio — last point is always the real Assets value.
 */
export function buildLiveHistory(
  cardsValue: number,
  sealedValue: number,
  invested: number,
  days = 365,
): LiveHistoryPoint[] {
  const total = cardsValue + sealedValue;
  const end = new Date();
  end.setHours(12, 0, 0, 0);
  const points: LiveHistoryPoint[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(end);
    d.setDate(end.getDate() - (days - 1 - i));
    const t = days <= 1 ? 1 : i / (days - 1);
    // Mild ramp toward current (no fake €12k curve)
    const factor = 0.96 + 0.04 * t;
    const c = round2(cardsValue * factor);
    const s = round2(sealedValue * factor);
    const m = round2(c + s);
    const inv = round2(invested * (0.98 + 0.02 * t));
    points.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
      value: m,
      cards: c,
      sealed: s,
      market: m,
      invested: inv,
    });
  }

  // Force last point exactly to live totals
  if (points.length) {
    const last = points[points.length - 1];
    last.value = total;
    last.cards = cardsValue;
    last.sealed = sealedValue;
    last.market = total;
    last.invested = invested;
  }

  return points;
}

/**
 * Live portfolio totals from Assets → Karten + Sealed only
 * (API when logged in, localStorage in demo).
 */
export function usePortfolioAssets(): LivePortfolioSnapshot {
  const { isAuthenticated, isLoading: authLoading } = useAuthMode();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<LivePosition[]>([]);
  const [sealed, setSealed] = useState<LivePosition[]>([]);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    const localCards = getLocalCollection().map(posFromCard);
    const localSealed = getLocalSealed().map(posFromSealed);

    if (!isAuthenticated) {
      setCards(localCards);
      setSealed(localSealed);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/collection"),
        fetch("/api/sealed"),
      ]);

      // Logged-in: trust API only (even if empty). No mock/local mix-in.
      if (cRes.ok) {
        const data = await cRes.json();
        const items = (data.items ?? data.data ?? []) as ApiCollectionItem[];
        setCards(Array.isArray(items) ? items.map(posFromCard) : []);
      } else {
        setCards(localCards);
      }

      if (sRes.ok) {
        const data = await sRes.json();
        const items = (data.items ?? []) as ApiSealedItem[];
        setSealed(Array.isArray(items) ? items.map(posFromSealed) : []);
      } else {
        setSealed(localSealed);
      }
    } catch {
      setCards(localCards);
      setSealed(localSealed);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => void refresh();
    window.addEventListener("cardcap-collection-changed", onChange);
    window.addEventListener(SEALED_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("cardcap-collection-changed", onChange);
      window.removeEventListener(SEALED_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return useMemo(() => {
    const cardsValue = round2(cards.reduce((s, c) => s + c.market, 0));
    const cardsInvested = round2(cards.reduce((s, c) => s + c.invested, 0));
    const cardsCount = cards.reduce((s, c) => s + c.quantity, 0);
    const cardsUnique = cards.length;

    const sealedValue = round2(sealed.reduce((s, c) => s + c.market, 0));
    const sealedInvested = round2(sealed.reduce((s, c) => s + c.invested, 0));
    const sealedProducts = sealed.length;
    const sealedUnits = sealed.reduce((s, c) => s + c.quantity, 0);

    const totalValue = round2(cardsValue + sealedValue);
    const invested = round2(cardsInvested + sealedInvested);
    const unrealized = round2(totalValue - invested);
    const returnRate =
      invested > 0
        ? Math.round((unrealized / invested) * 1000) / 10
        : totalValue > 0
          ? 100
          : 0;

    const positions = [...cards, ...sealed];
    const topPositions = [...positions]
      .sort((a, b) => b.market - a.market)
      .slice(0, 5);

    const withInvested = positions.filter((p) => p.invested > 0 || p.market > 0);
    const bestReturn =
      withInvested.length === 0
        ? null
        : [...withInvested].sort((a, b) => b.returnPct - a.returnPct)[0];
    const worstReturn =
      withInvested.length === 0
        ? null
        : [...withInvested].sort((a, b) => a.returnPct - b.returnPct)[0];

    const allocation =
      totalValue <= 0
        ? []
        : (
            [
              {
                label: "Karten",
                percent: Math.round((cardsValue / totalValue) * 1000) / 10,
                color: "#f472b6",
                value: cardsValue,
              },
              {
                label: "Sealed",
                percent: Math.round((sealedValue / totalValue) * 1000) / 10,
                color: "#a78bfa",
                value: sealedValue,
              },
            ] as LiveAllocSegment[]
          ).filter((a) => a.value > 0);

    // Set groups from live cards only
    const setMap = new Map<
      string,
      { setId: string; setName: string; owned: number; value: number }
    >();
    for (const c of cards) {
      const key = c.setId || c.setName || "unbekannt";
      const prev = setMap.get(key) ?? {
        setId: c.setId || key,
        setName: c.setName || "Unbekanntes Set",
        owned: 0,
        value: 0,
      };
      prev.owned += c.quantity;
      prev.value += c.market;
      setMap.set(key, prev);
    }
    const setGroups = [...setMap.values()]
      .sort((a, b) => b.value - a.value || b.owned - a.owned)
      .slice(0, 8);

    // Allocation dimensions from all live positions
    const bySet = new Map<string, number>();
    const byLang = new Map<string, number>();
    const byCond = new Map<string, number>();
    for (const p of positions) {
      const setKey = p.setName || "Ohne Set";
      bySet.set(setKey, (bySet.get(setKey) ?? 0) + p.market);
      const langKey = p.language || "—";
      byLang.set(langKey, (byLang.get(langKey) ?? 0) + p.market);
      const condKey = p.condition || "—";
      byCond.set(condKey, (byCond.get(condKey) ?? 0) + p.market);
    }

    const allocationBy = {
      assetType: allocation,
      set: groupAllocation(
        [...bySet.entries()].map(([label, value]) => ({ label, value })),
        totalValue,
      ),
      language: groupAllocation(
        [...byLang.entries()].map(([label, value]) => ({ label, value })),
        totalValue,
      ),
      condition: groupAllocation(
        [...byCond.entries()].map(([label, value]) => ({ label, value })),
        totalValue,
      ),
    };

    const history = buildLiveHistory(cardsValue, sealedValue, invested, 730);

    return {
      loading,
      cardsValue,
      cardsInvested,
      cardsCount,
      cardsUnique,
      sealedValue,
      sealedInvested,
      sealedProducts,
      sealedUnits,
      totalValue,
      invested,
      unrealized,
      returnRate,
      positions,
      topPositions,
      bestReturn,
      worstReturn,
      allocation,
      history,
      setGroups,
      allocationBy,
      refresh,
    };
  }, [cards, sealed, loading, refresh]);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Simple sparkline ending at `end`, flat-ish history for empty start. */
export function sparkToValue(end: number, points = 12): number[] {
  if (end <= 0) return Array.from({ length: points }, () => 0);
  const start = end * 0.92;
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const wave = Math.sin(i * 0.9) * end * 0.01;
    return Math.round((start + (end - start) * t + wave) * 100) / 100;
  });
}
