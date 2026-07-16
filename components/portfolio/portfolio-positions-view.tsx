"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CardImage } from "@/components/ui/card-image";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  getCard,
  portfolioPositionsList,
  portfolioPositionsSummary,
  type PortfolioPosition,
  type PositionStatus,
} from "@/lib/mock-data";

type Scope = "gesamt" | "karten" | "sealed";
type Range = "30d" | "6m" | "1y" | "max";
type StatusFilter = PositionStatus | "all";
type SortKey = "return-desc" | "return-asc" | "profit-desc" | "name";

const ranges: { id: Range; label: string }[] = [
  { id: "30d", label: "30 Tage" },
  { id: "6m", label: "6 Monate" },
  { id: "1y", label: "1 Jahr" },
  { id: "max", label: "Max" },
];

const statusTabs: { id: StatusFilter; label: string; count: number; tone?: string }[] = [
  {
    id: "plus",
    label: "Im Plus",
    count: portfolioPositionsSummary.plus,
    tone: "plus",
  },
  {
    id: "flat",
    label: "Unverändert",
    count: portfolioPositionsSummary.flat,
  },
  {
    id: "minus",
    label: "Im Minus",
    count: portfolioPositionsSummary.minus,
    tone: "minus",
  },
  {
    id: "all",
    label: "Alle",
    count: portfolioPositionsSummary.all,
  },
];

export function PortfolioPositionsView() {
  const [scope, setScope] = useState<Scope>("gesamt");
  const [range, setRange] = useState<Range>("1y");
  const [status, setStatus] = useState<StatusFilter>("plus");
  const [search, setSearch] = useState("");
  const [assetType, setAssetType] = useState("Alle");
  const [setFilter, setSetFilter] = useState("Alle");
  const [language, setLanguage] = useState("Alle");
  const [condition, setCondition] = useState("Alle");
  const [sort, setSort] = useState<SortKey>("return-desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const setNames = useMemo(
    () => [
      "Alle",
      ...Array.from(new Set(portfolioPositionsList.map((p) => p.setName))).sort(),
    ],
    [],
  );

  const filtered = useMemo(() => {
    let rows = [...portfolioPositionsList];

    if (status !== "all") rows = rows.filter((r) => r.status === status);
    if (scope === "karten") rows = rows.filter((r) => r.kind === "Karte");
    if (scope === "sealed") rows = rows.filter((r) => r.kind === "Sealed");
    if (assetType !== "Alle") rows = rows.filter((r) => r.kind === assetType);
    if (setFilter !== "Alle") rows = rows.filter((r) => r.setName === setFilter);
    if (language !== "Alle") rows = rows.filter((r) => r.language === language);
    if (condition !== "Alle") rows = rows.filter((r) => r.condition === condition);

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.setName.toLowerCase().includes(q),
      );
    }

    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "de");
      if (sort === "return-asc") return a.returnPct - b.returnPct;
      if (sort === "profit-desc") return b.profit - a.profit;
      return b.returnPct - a.returnPct;
    });

    return rows;
  }, [
    status,
    scope,
    assetType,
    setFilter,
    language,
    condition,
    search,
    sort,
  ]);

  // Demo list is short — metrics still show full summary for "plus" tab
  const metrics = useMemo(() => {
    if (status === "plus" && filtered.length > 0) {
      return {
        count: portfolioPositionsSummary.plus,
        pct: portfolioPositionsSummary.plusPct,
        totalProfit: portfolioPositionsSummary.totalProfitPlus,
        avgReturn: portfolioPositionsSummary.avgReturnPlus,
        title: "Positionen im Plus",
        tableTitle: "Positionen im Plus",
        tableHint: "Vergleich mit dem persönlichen Einkaufspreis",
      };
    }
    if (status === "minus") {
      const profit = filtered.reduce((s, r) => s + r.profit, 0);
      const avg =
        filtered.length > 0
          ? filtered.reduce((s, r) => s + r.returnPct, 0) / filtered.length
          : 0;
      return {
        count: portfolioPositionsSummary.minus,
        pct: Math.round(
          (portfolioPositionsSummary.minus / portfolioPositionsSummary.all) *
            100,
        ),
        totalProfit: profit,
        avgReturn: avg,
        title: "Positionen im Minus",
        tableTitle: "Positionen im Minus",
        tableHint: "Vergleich mit dem persönlichen Einkaufspreis",
      };
    }
    if (status === "flat") {
      return {
        count: portfolioPositionsSummary.flat,
        pct: Math.round(
          (portfolioPositionsSummary.flat / portfolioPositionsSummary.all) *
            100,
        ),
        totalProfit: 0,
        avgReturn: 0,
        title: "Unveränderte Positionen",
        tableTitle: "Unveränderte Positionen",
        tableHint: "Kein messbarer Gewinn oder Verlust",
      };
    }
    const profit = filtered.reduce((s, r) => s + r.profit, 0);
    const avg =
      filtered.length > 0
        ? filtered.reduce((s, r) => s + r.returnPct, 0) / filtered.length
        : 0;
    return {
      count: portfolioPositionsSummary.all,
      pct: 100,
      totalProfit: profit,
      avgReturn: avg,
      title: "Alle Positionen",
      tableTitle: "Alle Positionen",
      tableHint: "Vergleich mit dem persönlichen Einkaufspreis",
    };
  }, [status, filtered]);

  const totalPages = Math.max(1, Math.ceil(Math.max(filtered.length, 1) / pageSize));
  // For demo: if status is plus and we have only 10 demo rows, show them all as page 1 of many
  const displayCount =
    status === "plus"
      ? portfolioPositionsSummary.plus
      : status === "minus"
        ? portfolioPositionsSummary.minus
        : status === "flat"
          ? portfolioPositionsSummary.flat
          : portfolioPositionsSummary.all;
  const safePage = Math.min(page, Math.max(1, Math.ceil(displayCount / pageSize)));
  const pageRows = filtered.slice(0, pageSize);

  function resetFilters() {
    setSearch("");
    setAssetType("Alle");
    setSetFilter("Alle");
    setLanguage("Alle");
    setCondition("Alle");
    setSort("return-desc");
    setPage(1);
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">
            <Link href="/portfolio" className="hover:text-[var(--foreground)]">
              Portfolio
            </Link>
            <span className="mx-1.5 opacity-50">/</span>
            <Link
              href="/portfolio?tab=analyse"
              className="hover:text-[var(--foreground)]"
            >
              Analyse
            </Link>
            <span className="mx-1.5 opacity-50">/</span>
            <span className="text-[var(--foreground)]">Positionen</span>
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            Gewinner &amp; Verlierer
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Performance aller bewerteten Positionen im gewählten Zeitraum
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            options={[
              { id: "gesamt", label: "Gesamt" },
              { id: "karten", label: "Karten" },
              { id: "sealed", label: "Sealed" },
            ]}
            value={scope}
            onChange={(v) => {
              setScope(v);
              setPage(1);
            }}
            accent
          />
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ExportIcon />
            Exportieren
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

      {/* Back + range */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/portfolio?tab=analyse"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Zurück zur Analyse
        </Link>
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

      {/* Status tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {statusTabs.map((tab) => {
          const active = status === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? tab.tone === "plus"
                    ? "bg-[var(--accent)] text-white"
                    : tab.tone === "minus"
                      ? "bg-[var(--negative)] text-white"
                      : "bg-[var(--surface-elevated)] text-[var(--foreground)] ring-1 ring-[var(--border)]"
                  : "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}{" "}
              <span
                className={
                  active
                    ? "opacity-90"
                    : tab.tone === "minus"
                      ? "text-[var(--negative)]"
                      : ""
                }
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon="trend"
          label={metrics.title}
          value={String(metrics.count)}
          hint={`${metrics.pct} %`}
          positive={status === "plus"}
        />
        <MetricCard
          icon="wallet"
          label={status === "minus" ? "Verlust gesamt" : "Gewinn gesamt"}
          value={`${metrics.totalProfit >= 0 ? "+" : ""}${formatCurrency(metrics.totalProfit)}`}
          positive={metrics.totalProfit > 0}
          negative={metrics.totalProfit < 0}
        />
        <MetricCard
          icon="pct"
          label={
            status === "minus"
              ? "Ø Rendite der Verlierer"
              : status === "flat"
                ? "Ø Rendite"
                : "Ø Rendite der Gewinner"
          }
          value={formatPercent(metrics.avgReturn)}
          positive={metrics.avgReturn > 0}
          negative={metrics.avgReturn < 0}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
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
            placeholder="Position oder Set suchen"
            className="h-9 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </label>
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
        <FilterSelect
          label="Sprache"
          value={language}
          onChange={(v) => {
            setLanguage(v);
            setPage(1);
          }}
          options={["Alle", "DE", "EN", "JP", "FR"]}
        />
        <FilterSelect
          label="Zustand"
          value={condition}
          onChange={(v) => {
            setCondition(v);
            setPage(1);
          }}
          options={[
            "Alle",
            "Mint",
            "Near Mint",
            "Excellent",
            "Good",
            "Light Played",
            "Played",
            "Poor",
            "OVP",
          ]}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="return-desc">Rendite: höchste zuerst</option>
          <option value="return-asc">Rendite: niedrigste zuerst</option>
          <option value="profit-desc">Gewinn: höchster zuerst</option>
          <option value="name">Name A–Z</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[var(--accent)] hover:opacity-80"
        >
          <span aria-hidden>↺</span>
          Filter zurücksetzen
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <h2 className="text-sm font-medium">{metrics.tableTitle}</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{metrics.tableHint}</p>
        </div>

        <div className="hidden border-b border-[var(--border)] px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--muted)] xl:grid xl:grid-cols-[2.5rem_minmax(12rem,1.5fr)_4.5rem_minmax(7rem,1fr)_3.5rem_5.5rem_5.5rem_6rem_5rem_4.5rem_1.25rem] xl:gap-2 xl:px-5">
          <span>#</span>
          <span>Position</span>
          <span>Typ</span>
          <span>Set / Produkt</span>
          <span className="text-right">Menge</span>
          <span className="text-right">Investiert</span>
          <span className="text-right">Marktwert</span>
          <span className="text-right">Gewinn / Verlust</span>
          <span className="text-right">Rendite</span>
          <span className="text-right">Entwicklung</span>
          <span />
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {pageRows.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-[var(--muted)]">
              Keine Positionen für diese Filter.
            </li>
          )}
          {pageRows.map((row, index) => (
            <PositionRow
              key={row.id}
              row={row}
              rank={(safePage - 1) * pageSize + index + 1}
            />
          ))}
        </ul>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              1–{Math.min(pageSize, pageRows.length)} von {displayCount}{" "}
              Positionen
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
            <span>
              Marktpreise zuletzt aktualisiert:{" "}
              {portfolioPositionsSummary.pricesUpdatedLabel}
            </span>
          </div>
          <Pagination
            page={safePage}
            totalPages={Math.max(1, Math.ceil(displayCount / pageSize))}
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

function PositionRow({
  row,
  rank,
}: {
  row: PortfolioPosition;
  rank: number;
}) {
  const card = getCard(row.cardId);
  const pos = row.profit > 0;
  const neg = row.profit < 0;

  return (
    <li className="px-4 py-3 transition-colors hover:bg-[var(--surface-elevated)]/50 sm:px-5">
      {/* mobile */}
      <div className="flex gap-3 xl:hidden">
        <span className="tabular-nums w-5 shrink-0 pt-1 text-sm text-[var(--muted)]">
          {rank}
        </span>
        <CardImage src={card.imageUrl} alt={row.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.name}</p>
              <p className="truncate text-xs text-[var(--muted)]">{row.setName}</p>
            </div>
            <KindBadge kind={row.kind} />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="text-xs text-[var(--muted)]">
              <span className="tabular-nums">{formatCurrency(row.invested)}</span>
              <span className="mx-1">→</span>
              <span className="tabular-nums text-[var(--foreground)]">
                {formatCurrency(row.market)}
              </span>
            </div>
            <div className="text-right">
              <p
                className={`tabular-nums text-sm font-medium ${
                  pos
                    ? "text-[var(--positive)]"
                    : neg
                      ? "text-[var(--negative)]"
                      : "text-[var(--muted)]"
                }`}
              >
                {pos ? "+" : ""}
                {formatCurrency(row.profit)}
              </p>
              <p
                className={`tabular-nums text-xs ${
                  pos
                    ? "text-[var(--positive)]"
                    : neg
                      ? "text-[var(--negative)]"
                      : "text-[var(--muted)]"
                }`}
              >
                {pos ? "+" : ""}
                {row.returnPct.toLocaleString("de-DE")} %
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <MiniTrend values={row.trend} positive={pos || !neg} />
            <Chevron />
          </div>
        </div>
      </div>

      {/* desktop */}
      <div className="hidden items-center gap-2 xl:grid xl:grid-cols-[2.5rem_minmax(12rem,1.5fr)_4.5rem_minmax(7rem,1fr)_3.5rem_5.5rem_5.5rem_6rem_5rem_4.5rem_1.25rem]">
        <span className="tabular-nums text-sm text-[var(--muted)]">{rank}</span>
        <div className="flex min-w-0 items-center gap-3">
          <CardImage src={card.imageUrl} alt={row.name} size="sm" />
          <p className="truncate text-sm font-medium">{row.name}</p>
        </div>
        <KindBadge kind={row.kind} />
        <p className="truncate text-sm text-[var(--muted)]">{row.setName}</p>
        <p className="tabular-nums text-right text-sm">{row.quantity}</p>
        <p className="tabular-nums text-right text-sm text-[var(--muted)]">
          {formatCurrency(row.invested)}
        </p>
        <p className="tabular-nums text-right text-sm">
          {formatCurrency(row.market)}
        </p>
        <p
          className={`tabular-nums text-right text-sm font-medium ${
            pos
              ? "text-[var(--positive)]"
              : neg
                ? "text-[var(--negative)]"
                : "text-[var(--muted)]"
          }`}
        >
          {pos ? "+" : ""}
          {formatCurrency(row.profit)}
        </p>
        <p
          className={`tabular-nums text-right text-sm font-medium ${
            pos
              ? "text-[var(--positive)]"
              : neg
                ? "text-[var(--negative)]"
                : "text-[var(--muted)]"
          }`}
        >
          {pos ? "+" : ""}
          {row.returnPct.toLocaleString("de-DE")} %
        </p>
        <div className="flex justify-end">
          <MiniTrend values={row.trend} positive={pos || !neg} />
        </div>
        <div className="flex justify-end text-[var(--muted)]">
          <Chevron />
        </div>
      </div>
    </li>
  );
}

function KindBadge({ kind }: { kind: "Karte" | "Sealed" }) {
  return (
    <span
      className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-medium ${
        kind === "Sealed"
          ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20"
          : "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20"
      }`}
    >
      {kind}
    </span>
  );
}

function MiniTrend({
  values,
  positive,
}: {
  values: number[];
  positive: boolean;
}) {
  const w = 56;
  const h = 22;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.01);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? "var(--accent)" : "var(--negative)"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  positive,
  negative,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon === "trend" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" />
            <path d="M15 5h5v5" strokeLinecap="round" />
          </svg>
        )}
        {icon === "wallet" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            <path d="M3 7V5a2 2 0 0 1 2-2h12" />
            <circle cx="17" cy="13" r="1" fill="currentColor" />
          </svg>
        )}
        {icon === "pct" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <circle cx="8" cy="8" r="2.5" />
            <circle cx="16" cy="16" r="2.5" />
            <path d="M7 17 17 7" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
        </p>
        <p
          className={`tabular-nums mt-0.5 text-xl font-semibold ${
            positive
              ? "text-[var(--positive)]"
              : negative
                ? "text-[var(--negative)]"
                : ""
          }`}
        >
          {value}
        </p>
        {hint && (
          <p
            className={`tabular-nums text-xs ${
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

function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent?: boolean;
}) {
  return (
    <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            value === opt.id
              ? accent
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-elevated)] text-[var(--foreground)] ring-1 ring-[var(--border)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
  const pages = Array.from(
    { length: Math.min(totalPages, 3) },
    (_, i) => i + 1,
  );
  return (
    <div className="flex items-center gap-1">
      <PageBtn disabled={page <= 1} onClick={() => onChange(1)} label="«" />
      <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)} label="‹" />
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
      {totalPages > 3 && <span className="px-1">…</span>}
      {totalPages > 3 && (
        <button
          type="button"
          onClick={() => onChange(totalPages)}
          className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-[var(--border)] px-1 text-xs text-[var(--muted)]"
        >
          {totalPages}
        </button>
      )}
      <PageBtn
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        label="›"
      />
      <PageBtn
        disabled={page >= totalPages}
        onClick={() => onChange(totalPages)}
        label="»"
      />
    </div>
  );
}

function PageBtn({
  disabled,
  onClick,
  label,
}: {
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] disabled:opacity-40"
    >
      {label}
    </button>
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

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 4v10m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" strokeLinecap="round" />
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

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
