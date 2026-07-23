"use client";

import { useMemo, useRef, useState } from "react";
import {
  TransactionDrawer,
  type PositionOption,
  type TransactionSavePayload,
} from "@/components/portfolio/transaction-drawer";
import { CardImage } from "@/components/ui/card-image";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import {
  clearPortfolioAssetsCache,
  usePortfolioAssets,
} from "@/hooks/use-portfolio-assets";
import { applyAssetSale } from "@/lib/apply-asset-sale";
import {
  invalidateCollectionCache,
  invalidateSealedCache,
} from "@/lib/assets-client-cache";
import { formatCurrency, formatPercent } from "@/lib/format";

type TxKind = "Kauf" | "Verkauf";
type TxRange = "30d" | "6m" | "1y" | "max";
type CashMode = "monatlich" | "kumuliert";
type SortKey = "newest" | "oldest" | "total-desc" | "total-asc";

type DetailedTransaction = {
  id: string;
  dateIso: string;
  dateLabel: string;
  type: TxKind;
  cardId: string;
  name: string;
  assetType: "Karte" | "Sealed";
  setName: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  total: number;
  realizedProfit: number | null;
  note: string;
  imageUrl?: string;
  imageFallbacks?: string[];
};

type TxCashflowMonth = {
  label: string;
  buys: number;
  sells: number;
  net: number;
};

const ranges: { id: TxRange; label: string }[] = [
  { id: "30d", label: "30 Tage" },
  { id: "6m", label: "6 Monate" },
  { id: "1y", label: "1 Jahr" },
  { id: "max", label: "Max" },
];

export function PortfolioTransactions() {
  const live = usePortfolioAssets();
  const { isAuthenticated } = useAuthMode();
  const [range, setRange] = useState<TxRange>("max");
  const [cashMode, setCashMode] = useState<CashMode>("monatlich");
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("Alle");
  const [assetType, setAssetType] = useState("Alle");
  const [setFilter, setSetFilter] = useState("Alle");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localTx, setLocalTx] = useState<DetailedTransaction[]>([]);

  const drawerPositions: PositionOption[] = useMemo(
    () =>
      live.positions.map((p) => ({
        id: p.id,
        label: p.setName ? `${p.name} (${p.setName})` : p.name,
        kind: p.kind,
        quantity: p.quantity,
        setName: p.setName,
        imageUrl: p.imageUrl,
      })),
    [live.positions],
  );

  // Only recorded transactions (drawer) — not inventory snapshots as fake "Käufe"
  const setNames = useMemo(
    () => [
      "Alle",
      ...Array.from(
        new Set(
          [
            ...localTx.map((t) => t.setName),
            ...live.positions.map((p) => p.setName),
          ].filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "de")),
    ],
    [localTx, live.positions],
  );

  const filtered = useMemo(() => {
    let rows = [...localTx];
    if (txType !== "Alle") rows = rows.filter((r) => r.type === txType);
    if (assetType !== "Alle")
      rows = rows.filter((r) => r.assetType === assetType);
    if (setFilter !== "Alle") rows = rows.filter((r) => r.setName === setFilter);
    if (dateFrom) rows = rows.filter((r) => r.dateIso >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.dateIso <= dateTo);

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.setName.toLowerCase().includes(q) ||
          r.note.toLowerCase().includes(q),
      );
    }

    rows.sort((a, b) => {
      if (sort === "oldest") return a.dateIso.localeCompare(b.dateIso);
      if (sort === "total-desc") return b.total - a.total;
      if (sort === "total-asc") return a.total - b.total;
      return b.dateIso.localeCompare(a.dateIso);
    });
    return rows;
  }, [
    localTx,
    txType,
    assetType,
    setFilter,
    dateFrom,
    dateTo,
    search,
    sort,
  ]);

  const m = useMemo(() => {
    const buys = filtered.filter((t) => t.type === "Kauf");
    const sells = filtered.filter((t) => t.type === "Verkauf");
    // Units (Stück) — not number of rows
    const buyUnits = buys.reduce((s, t) => s + t.quantity, 0);
    const sellUnits = sells.reduce((s, t) => s + t.quantity, 0);
    const typeUnits = buyUnits + sellUnits;
    const buyVolume = buys.reduce((s, t) => s + t.total, 0);
    const sellVolume = sells.reduce((s, t) => s + t.total, 0);
    const fees = filtered.reduce((s, t) => s + t.fees, 0);
    const realizedProfit = sells.reduce(
      (s, t) => s + (t.realizedProfit ?? 0),
      0,
    );
    const last = filtered[0];
    const cardUnits = filtered
      .filter((t) => t.assetType === "Karte")
      .reduce((s, t) => s + t.quantity, 0);
    const sealedUnits = filtered
      .filter((t) => t.assetType === "Sealed")
      .reduce((s, t) => s + t.quantity, 0);
    const assetUnits = cardUnits + sealedUnits;

    // Busiest month by unit count
    const monthMap = new Map<string, number>();
    for (const t of filtered) {
      const key = t.dateIso.slice(0, 7);
      if (!key || key === "1970-01") continue;
      monthMap.set(key, (monthMap.get(key) ?? 0) + t.quantity);
    }
    let busiestMonth = "—";
    let busiestN = 0;
    for (const [k, n] of monthMap) {
      if (n > busiestN) {
        busiestN = n;
        const [y, mo] = k.split("-");
        const d = new Date(Number(y), Number(mo) - 1, 1);
        busiestMonth = d.toLocaleDateString("de-DE", {
          month: "long",
          year: "numeric",
        });
      }
    }

    return {
      buyCount: buyUnits,
      buyVolume: Math.round(buyVolume * 100) / 100,
      sellCount: sellUnits,
      sellVolume: Math.round(sellVolume * 100) / 100,
      realizedProfit: Math.round(realizedProfit * 100) / 100,
      realizedReturnPct: 0,
      fees: Math.round(fees * 100) / 100,
      avgBuy: buyUnits ? Math.round((buyVolume / buyUnits) * 100) / 100 : 0,
      avgSell: sellUnits ? Math.round((sellVolume / sellUnits) * 100) / 100 : 0,
      lastTxDate: last?.dateLabel ?? "—",
      totalTx: filtered.length,
      cardTx: cardUnits,
      sealedTx: sealedUnits,
      buySharePct:
        typeUnits > 0 ? Math.round((buyUnits / typeUnits) * 100) : 0,
      sellSharePct:
        typeUnits > 0 ? Math.round((sellUnits / typeUnits) * 100) : 0,
      cardSharePct:
        assetUnits > 0 ? Math.round((cardUnits / assetUnits) * 100) : 0,
      sealedSharePct:
        assetUnits > 0 ? Math.round((sealedUnits / assetUnits) * 100) : 0,
      busiestMonth,
      hasData: typeUnits > 0,
    };
  }, [filtered]);

  const portfolioTxCashflow: TxCashflowMonth[] = useMemo(() => {
    // Group buys by month from live assets
    const map = new Map<string, { buys: number; sells: number }>();
    for (const t of filtered) {
      const key = t.dateIso.slice(0, 7) || "ohne-datum";
      const prev = map.get(key) ?? { buys: 0, sells: 0 };
      if (t.type === "Kauf") prev.buys += t.total;
      else prev.sells += t.total;
      map.set(key, prev);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, v]) => {
        let label = key;
        if (key.includes("-")) {
          const [y, mo] = key.split("-");
          const d = new Date(Number(y), Number(mo) - 1, 1);
          label = d.toLocaleDateString("de-DE", {
            month: "short",
            year: "2-digit",
          });
        }
        return {
          label,
          buys: Math.round(v.buys * 100) / 100,
          sells: Math.round(v.sells * 100) / 100,
          net: Math.round((v.sells - v.buys) * 100) / 100,
        };
      });
  }, [filtered]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(totalCount, 1) / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetFilters() {
    setSearch("");
    setTxType("Alle");
    setAssetType("Alle");
    setSetFilter("Alle");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        positions={drawerPositions}
        onSave={async (payload: TransactionSavePayload) => {
          // Verkauf → remove from Assets inventory
          if (payload.type === "Verkauf") {
            const result = await applyAssetSale(
              {
                id: payload.positionId,
                kind: payload.kind,
                availableQty: payload.availableQty,
              },
              payload.quantity,
              isAuthenticated,
            );
            if (!result.ok) {
              throw new Error(result.error ?? "Verkauf fehlgeschlagen.");
            }
            clearPortfolioAssetsCache();
            invalidateCollectionCache();
            invalidateSealedCache();
            live.refresh({ force: true });
          }

          const total =
            payload.pricePerUnit * payload.quantity + payload.fees;
          const dateIso = payload.date;
          const [y, mo, d] = dateIso.split("-");
          const pos = live.positions.find((p) => p.id === payload.positionId);
          setLocalTx((prev) => [
            {
              id: `local-${Date.now()}`,
              dateIso,
              dateLabel: `${d}.${mo}.${y}`,
              type: payload.type,
              cardId: payload.positionId,
              name: payload.positionLabel,
              assetType: payload.kind,
              setName: pos?.setName ?? "—",
              quantity: payload.quantity,
              pricePerUnit: payload.pricePerUnit,
              fees: payload.fees,
              total,
              realizedProfit:
                payload.type === "Verkauf"
                  ? Math.round(
                      (payload.pricePerUnit * payload.quantity -
                        (pos
                          ? (pos.invested / Math.max(1, pos.quantity)) *
                            payload.quantity
                          : 0) -
                        payload.fees) *
                        100,
                    ) / 100
                  : null,
              note: payload.note || payload.source,
              imageUrl: pos?.imageUrl,
              imageFallbacks: pos?.imageFallbacks,
            },
            ...prev,
          ]);
        }}
      />

      {/* Range */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white hover:brightness-110"
          >
            <span className="text-base leading-none">+</span>
            Transaktion erfassen
          </button>
        </div>
        <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                range === r.id
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          icon="cart"
          label="Käufe"
          value={String(m.buyCount)}
          hint={`${formatCurrency(m.buyVolume)} Einkaufsvolumen`}
          accent
        />
        <Metric
          icon="sell"
          label="Verkäufe"
          value={String(m.sellCount)}
          hint={`${formatCurrency(m.sellVolume)} Verkaufserlös`}
        />
        <Metric
          icon="trend"
          label="Realisierter Gewinn"
          value={formatCurrency(m.realizedProfit)}
          hint="Verkäufe folgen, sobald sie erfasst werden"
          positive={m.realizedProfit >= 0}
        />
        <Metric
          icon="pct"
          label="Gebühren"
          value={formatCurrency(m.fees)}
        />
      </div>

      {/* Secondary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Strip label="Ø Kauf" value={formatCurrency(m.avgBuy)} icon="bag" />
        <Strip label="Ø Verkauf" value={formatCurrency(m.avgSell)} icon="cart" />
        <Strip label="Letzte Transaktion" value={m.lastTxDate} icon="cal" />
        <Strip
          label="Transaktionen gesamt"
          value={String(m.totalTx)}
          icon="list"
        />
      </div>

      {/* Cashflow + types */}
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Cashflow</h2>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-pink-400/90" />
                  Käufe
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-emerald-400/90" />
                  Verkäufe
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-zinc-300" />
                  Netto-Cashflow
                </span>
              </div>
            </div>
            <div className="flex rounded-full border border-[var(--border)] p-0.5">
              {(
                [
                  ["monatlich", "Monatlich"],
                  ["kumuliert", "Kumuliert"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCashMode(id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    cashMode === id
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <CashflowChart data={portfolioTxCashflow} mode={cashMode} />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-medium">Transaktionsarten</h2>
          <p className="mb-4 text-[11px] text-[var(--muted)]">
            Anteil nach Stückzahl erfasster Transaktionen
          </p>
          {!m.hasData ? (
            <p className="py-6 text-center text-xs text-[var(--muted)]">
              Noch keine Transaktionen erfasst. Mit „Transaktion erfassen“
              startest du.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Kauf / Verkauf
                </p>
                <ShareBar
                  color="#f472b6"
                  label="Käufe"
                  count={m.buyCount}
                  percent={m.buySharePct}
                  unit="Stk"
                  filterActive={txType === "Kauf"}
                  onClick={() => {
                    setTxType((t) => (t === "Kauf" ? "Alle" : "Kauf"));
                    setPage(1);
                  }}
                />
                <ShareBar
                  color="#4ade80"
                  label="Verkäufe"
                  count={m.sellCount}
                  percent={m.sellSharePct}
                  unit="Stk"
                  filterActive={txType === "Verkauf"}
                  onClick={() => {
                    setTxType((t) => (t === "Verkauf" ? "Alle" : "Verkauf"));
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-3 border-t border-[var(--border)] pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Nach Asset-Typ
                </p>
                <ShareBar
                  color="#f472b6"
                  label="Karten"
                  count={m.cardTx}
                  percent={m.cardSharePct}
                  unit="Stk"
                  filterActive={assetType === "Karte"}
                  onClick={() => {
                    setAssetType((t) => (t === "Karte" ? "Alle" : "Karte"));
                    setPage(1);
                  }}
                />
                <ShareBar
                  color="#a78bfa"
                  label="Sealed"
                  count={m.sealedTx}
                  percent={m.sealedSharePct}
                  unit="Stk"
                  filterActive={assetType === "Sealed"}
                  onClick={() => {
                    setAssetType((t) => (t === "Sealed" ? "Alle" : "Sealed"));
                    setPage(1);
                  }}
                />
              </div>

              <p className="text-xs text-[var(--muted)]">
                <span className="text-[var(--accent)]">↗</span> Aktivster Monat:{" "}
                <span className="text-[var(--foreground)]">{m.busiestMonth}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <label className="relative min-w-0 flex-1 lg:max-w-xs">
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
            placeholder="Position, Set oder Notiz suchen"
            className="h-9 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </label>
        <FilterSelect
          label="Transaktion"
          value={txType}
          onChange={(v) => {
            setTxType(v);
            setPage(1);
          }}
          options={["Alle", "Kauf", "Verkauf"]}
        />
        <FilterSelect
          label="Asset-Typ"
          value={assetType}
          onChange={(v) => {
            setAssetType(v);
            setPage(1);
          }}
          options={["Alle", "Karte", "Sealed"]}
        />
        <FilterSelect
          label="Set"
          value={setFilter}
          onChange={(v) => {
            setSetFilter(v);
            setPage(1);
          }}
          options={setNames}
        />
        <label className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--muted)]">
          Von
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-sm text-[var(--foreground)] outline-none"
          />
        </label>
        <label className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--muted)]">
          Bis
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-sm text-[var(--foreground)] outline-none"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="newest">Neueste zuerst</option>
          <option value="oldest">Älteste zuerst</option>
          <option value="total-desc">Betrag: höchster zuerst</option>
          <option value="total-asc">Betrag: niedrigster zuerst</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[var(--accent)] hover:opacity-80"
        >
          ↺ Filter zurücksetzen
        </button>
      </div>

      {/* History table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <h2 className="text-sm font-medium">Transaktionshistorie</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Alle Käufe und Verkäufe deiner Sammlung
          </p>
        </div>

        <div className="hidden border-b border-[var(--border)] px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--muted)] 2xl:grid 2xl:grid-cols-[6rem_5rem_minmax(11rem,1.4fr)_4rem_3rem_5.5rem_4.5rem_5.5rem_6rem_minmax(5rem,0.9fr)_1.5rem] 2xl:gap-2 2xl:px-5">
          <span>Datum</span>
          <span>Transaktion</span>
          <span>Position</span>
          <span>Typ</span>
          <span className="text-right">Menge</span>
          <span className="text-right">Preis / Stück</span>
          <span className="text-right">Gebühren</span>
          <span className="text-right">Gesamt</span>
          <span className="text-right">Realisierter Gewinn</span>
          <span>Notiz</span>
          <span />
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {pageRows.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-[var(--muted)]">
              Keine Transaktionen für diese Filter.
            </li>
          )}
          {pageRows.map((row) => (
            <TxRow key={row.id} row={row} />
          ))}
        </ul>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              1–{Math.min(pageSize, pageRows.length)} von {totalCount}{" "}
              Transaktionen
            </span>
            <label className="inline-flex items-center gap-1.5">
              Pro Seite
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
            <span>Alle Beträge inkl. hinterlegter Gebühren</span>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

function TxRow({ row }: { row: DetailedTransaction }) {
  const isBuy = row.type === "Kauf";
  const profit = row.realizedProfit;

  return (
    <li className="px-4 py-3 transition-colors hover:bg-[var(--surface-elevated)]/40 sm:px-5">
      {/* mobile */}
      <div className="flex gap-3 2xl:hidden">
        <CardImage
          src={row.imageUrl ?? ""}
          fallbacks={row.imageFallbacks}
          alt={row.name}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--muted)]">{row.dateLabel}</span>
            <TypeBadge type={row.type} />
            <AssetBadge type={row.assetType} />
          </div>
          <p className="mt-0.5 truncate text-sm font-medium">{row.name}</p>
          <div className="mt-1.5 flex flex-wrap items-end justify-between gap-2">
            <div className="text-xs text-[var(--muted)]">
              ×{row.quantity} · {formatCurrency(row.pricePerUnit)} +{" "}
              {formatCurrency(row.fees)} Geb.
            </div>
            <div className="text-right">
              <p className="tabular-nums text-sm font-medium">
                {formatCurrency(row.total)}
              </p>
              {profit != null ? (
                <p
                  className={`tabular-nums text-xs ${
                    profit >= 0
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]"
                  }`}
                >
                  {profit >= 0 ? "+" : ""}
                  {formatCurrency(profit)}
                </p>
              ) : (
                <p className="text-xs text-[var(--muted)]">—</p>
              )}
            </div>
          </div>
          <p className="mt-1 truncate text-[11px] text-[var(--muted)]">
            {row.note}
          </p>
        </div>
      </div>

      {/* desktop */}
      <div className="hidden items-center gap-2 2xl:grid 2xl:grid-cols-[6rem_5rem_minmax(11rem,1.4fr)_4rem_3rem_5.5rem_4.5rem_5.5rem_6rem_minmax(5rem,0.9fr)_1.5rem]">
        <span className="text-sm text-[var(--muted)]">{row.dateLabel}</span>
        <TypeBadge type={row.type} />
        <div className="flex min-w-0 items-center gap-2">
          <CardImage
            src={row.imageUrl ?? ""}
            fallbacks={row.imageFallbacks}
            alt={row.name}
            size="sm"
          />
          <span className="truncate text-sm font-medium">{row.name}</span>
        </div>
        <AssetBadge type={row.assetType} />
        <span className="tabular-nums text-right text-sm">{row.quantity}</span>
        <span className="tabular-nums text-right text-sm">
          {formatCurrency(row.pricePerUnit)}
        </span>
        <span className="tabular-nums text-right text-sm text-[var(--muted)]">
          {formatCurrency(row.fees)}
        </span>
        <span className="tabular-nums text-right text-sm font-medium">
          {formatCurrency(row.total)}
        </span>
        <span
          className={`tabular-nums text-right text-sm font-medium ${
            profit == null
              ? "text-[var(--muted)]"
              : profit >= 0
                ? "text-[var(--positive)]"
                : "text-[var(--negative)]"
          }`}
        >
          {profit == null
            ? "—"
            : `${profit >= 0 ? "+" : ""}${formatCurrency(profit)}`}
        </span>
        <span className="truncate text-sm text-[var(--muted)]">{row.note}</span>
        <button
          type="button"
          className="text-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Menü"
        >
          ⋮
        </button>
      </div>
    </li>
  );
}

function TypeBadge({ type }: { type: "Kauf" | "Verkauf" }) {
  const buy = type === "Kauf";
  return (
    <span
      className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-medium ${
        buy
          ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20"
          : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"
      }`}
    >
      {type}
    </span>
  );
}

function AssetBadge({ type }: { type: "Karte" | "Sealed" }) {
  return (
    <span
      className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-medium ${
        type === "Sealed"
          ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20"
          : "bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]"
      }`}
    >
      {type}
    </span>
  );
}

function CashflowChart({
  data,
  mode,
}: {
  data: TxCashflowMonth[];
  mode: CashMode;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => {
    if (mode === "monatlich") return data;
    let buySum = 0;
    let sellSum = 0;
    return data.map((d) => {
      buySum += d.buys;
      sellSum += d.sells;
      return {
        ...d,
        buys: buySum,
        sells: sellSum,
        net: sellSum - buySum,
      };
    });
  }, [data, mode]);

  const maxVal = Math.max(
    ...series.flatMap((d) => [d.buys, d.sells]),
    1,
  );
  const barMaxH = 120;

  function trackMouse(e: React.MouseEvent, index: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover(index);
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex h-52 items-end gap-2 sm:gap-3">
        {series.map((d, i) => {
          const buyH = Math.max(4, (d.buys / maxVal) * barMaxH);
          const sellH = Math.max(4, (d.sells / maxVal) * barMaxH);
          return (
            <div
              key={d.label}
              className="flex flex-1 flex-col items-center gap-1.5"
              onMouseEnter={(e) => trackMouse(e, i)}
              onMouseMove={(e) => trackMouse(e, i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex h-[7.5rem] w-full items-end justify-center gap-1">
                <div
                  className="w-[40%] max-w-[1.25rem] rounded-t-md bg-pink-400/90"
                  style={{
                    height: buyH,
                    opacity: hover == null || hover === i ? 1 : 0.4,
                  }}
                />
                <div
                  className="w-[40%] max-w-[1.25rem] rounded-t-md bg-emerald-400/90"
                  style={{
                    height: sellH,
                    opacity: hover == null || hover === i ? 1 : 0.4,
                  }}
                />
              </div>
              <span
                className={`tabular-nums text-[10px] font-medium ${
                  d.net >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"
                }`}
              >
                {d.net >= 0 ? "+" : ""}
                {Math.round(d.net)}
              </span>
              <span className="text-[10px] text-[var(--muted)]">{d.label}</span>
            </div>
          );
        })}
      </div>

      {hover != null && series[hover] && (
        <div
          className="pointer-events-none absolute z-20 min-w-[10rem] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-3 py-2 text-xs shadow-lg"
          style={{
            left: tip.x + 12,
            top: tip.y - 8,
            transform:
              tip.x > (wrapRef.current?.clientWidth ?? 0) * 0.65
                ? "translate(-100%, -100%)"
                : "translateY(-100%)",
          }}
        >
          <p className="font-medium">{series[hover].label}</p>
          <div className="mt-1.5 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-pink-300">Käufe</span>
              <span className="tabular-nums">
                −{formatCurrency(series[hover].buys)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-emerald-300">Verkäufe</span>
              <span className="tabular-nums">
                {formatCurrency(series[hover].sells)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-1">
              <span className="text-[var(--muted)]">Netto</span>
              <span
                className={`tabular-nums font-medium ${
                  series[hover].net >= 0
                    ? "text-[var(--positive)]"
                    : "text-[var(--negative)]"
                }`}
              >
                {series[hover].net >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(series[hover].net))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Interactive share bar — Stück + Anteil %, clickable filter. */
function ShareBar({
  color,
  label,
  count,
  percent,
  unit = "Stk",
  filterActive,
  onClick,
}: {
  color: string;
  label: string;
  count: number;
  percent: number;
  unit?: string;
  filterActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-[var(--surface-elevated)]/60 ${
        filterActive ? "bg-[var(--accent-soft)]/40" : ""
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="truncate font-medium text-[var(--foreground)]">
            {label}
          </span>
        </span>
        <span className="tabular-nums shrink-0 text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">
            {count.toLocaleString("de-DE")}
          </span>
          <span className="ml-1">{unit}</span>
          <span className="mx-1.5 opacity-40">·</span>
          <span className="font-medium text-[var(--foreground)]">
            {percent.toLocaleString("de-DE")} %
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full transition-all group-hover:brightness-110"
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </button>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  positive,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span
        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
          accent
            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
            : positive
              ? "bg-[var(--positive-soft)] text-[var(--positive)]"
              : "bg-[var(--accent-soft)] text-[var(--accent)]"
        }`}
      >
        <MIcon type={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
        </p>
        <p
          className={`tabular-nums mt-0.5 text-xl font-semibold ${
            positive ? "text-[var(--positive)]" : accent ? "text-[var(--accent)]" : ""
          }`}
        >
          {value}
        </p>
        {hint && (
          <p
            className={`text-xs ${
              positive ? "text-[var(--positive)]" : "text-[var(--muted)]"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

function Strip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]">
        <MIcon type={icon} />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
        </p>
        <p className="tabular-nums text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === "Alle" ? label : opt}
        </option>
      ))}
    </select>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: Math.min(totalPages, 6) }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] disabled:opacity-40"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
            p === page
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] disabled:opacity-40"
      >
        ›
      </button>
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

function MIcon({ type }: { type: string }) {
  const p = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
  } as const;
  switch (type) {
    case "cart":
      return (
        <svg {...p}>
          <path d="M3 5h2l2 12h10l2-8H7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="20" r="1" />
          <circle cx="17" cy="20" r="1" />
        </svg>
      );
    case "sell":
      return (
        <svg {...p}>
          <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" />
          <path d="M15 5h5v5" strokeLinecap="round" />
        </svg>
      );
    case "trend":
      return (
        <svg {...p}>
          <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" />
        </svg>
      );
    case "pct":
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="2.5" />
          <circle cx="16" cy="16" r="2.5" />
          <path d="M7 17 17 7" strokeLinecap="round" />
        </svg>
      );
    case "bag":
      return (
        <svg {...p}>
          <path d="M6 8h12l-1 12H7L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "cal":
      return (
        <svg {...p}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case "list":
      return (
        <svg {...p}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
