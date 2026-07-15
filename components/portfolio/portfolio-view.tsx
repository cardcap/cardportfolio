"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DonutChart } from "@/components/charts/donut-chart";
import { PortfolioAnalyse } from "@/components/portfolio/portfolio-analyse";
import { PortfolioTransactions } from "@/components/portfolio/portfolio-transactions";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { CardImage } from "@/components/ui/card-image";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  getCard,
  portfolioAllocationBy,
  portfolioAnalytics,
  portfolioAssetPerformance,
  portfolioCashflow,
  portfolioTransactions,
  portfolioYearHistory,
  valuablePositions,
  type PortfolioHistoryPoint,
} from "@/lib/mock-data";

type Scope = "gesamt" | "karten" | "sealed";
type Tab = "uebersicht" | "analyse" | "transaktionen";
type Range = "1W" | "1M" | "3M" | "6M" | "1J" | "MAX";
type AllocDim = "assetType" | "set" | "language" | "condition";
type ChartSeries = "gesamt" | "karten" | "sealed";

const ranges: Range[] = ["1W", "1M", "3M", "6M", "1J", "MAX"];

function tabFromSearch(raw: string | null): Tab {
  if (raw === "analyse" || raw === "transaktionen" || raw === "uebersicht") {
    return raw;
  }
  return "uebersicht";
}

export function PortfolioView() {
  const searchParams = useSearchParams();
  const [scope, setScope] = useState<Scope>("gesamt");
  const [tab, setTab] = useState<Tab>(() =>
    tabFromSearch(searchParams.get("tab")),
  );
  const [range, setRange] = useState<Range>("1J");
  const [chartSeries, setChartSeries] = useState<ChartSeries>("gesamt");
  const [allocDim, setAllocDim] = useState<AllocDim>("assetType");
  const a = portfolioAnalytics;

  useEffect(() => {
    setTab(tabFromSearch(searchParams.get("tab")));
  }, [searchParams]);

  const metrics = useMemo(() => {
    if (scope === "karten") {
      return {
        totalValue: a.cardsValue,
        invested: a.cardsInvested,
        unrealized: a.cardsValue - a.cardsInvested,
        returnRate: ((a.cardsValue - a.cardsInvested) / a.cardsInvested) * 100,
      };
    }
    if (scope === "sealed") {
      return {
        totalValue: a.sealedValue,
        invested: a.sealedInvested,
        unrealized: a.sealedValue - a.sealedInvested,
        returnRate:
          ((a.sealedValue - a.sealedInvested) / a.sealedInvested) * 100,
      };
    }
    return {
      totalValue: a.totalValue,
      invested: a.invested,
      unrealized: a.unrealizedProfit,
      returnRate: a.totalReturnRate,
    };
  }, [scope, a]);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Wertentwicklung, Rendite und Zusammensetzung deiner Sammlung
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
            onChange={setScope}
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
          <ThemeToggleButton className="!h-9 !w-9" />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-5 border-b border-[var(--border)]">
        {(
          [
            ["uebersicht", "Übersicht"],
            ["analyse", "Analyse"],
            ["transaktionen", "Transaktionen"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "uebersicht" && (
        <>
          {/* Primary metrics */}
          <div className="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <PrimaryMetric
              icon="doc"
              label="Gesamtwert"
              value={formatCurrency(metrics.totalValue)}
              hint={`+${a.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
              positive
            />
            <PrimaryMetric
              icon="coins"
              label="Investiert"
              value={formatCurrency(metrics.invested)}
            />
            <PrimaryMetric
              icon="trend"
              label="Unrealisierter Gewinn"
              value={`+${formatCurrency(metrics.unrealized)}`}
              positive
            />
            <PrimaryMetric
              icon="pct"
              label="Gesamtrendite"
              value={formatPercent(metrics.returnRate)}
              positive
            />
          </div>

          {/* Secondary investment KPIs */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SecondaryMetric
              icon="tag"
              label="Realisierter Gewinn"
              value={`+${formatCurrency(a.realizedProfit)}`}
              positive
            />
            <SecondaryMetric
              icon="price"
              label="Ø Kaufpreis"
              value={formatCurrency(a.avgPurchasePrice)}
            />
            <SecondaryMetric
              icon="clock"
              label="Haltedauer"
              value={`${a.holdDays} Tage`}
            />
            <SecondaryMetric
              icon="bars"
              label="Top-5-Anteil"
              value={`${a.top5Share} %`}
            />
          </div>

          {/* Chart + allocation */}
          <div className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium">Portfolio-Entwicklung</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded bg-[var(--accent)]" />
                      Marktwert
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded border-t border-dashed border-zinc-400" />
                      Investiertes Kapital
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented
                    options={[
                      { id: "gesamt", label: "Gesamt" },
                      { id: "karten", label: "Karten" },
                      { id: "sealed", label: "Sealed" },
                    ]}
                    value={chartSeries}
                    onChange={setChartSeries}
                    size="sm"
                  />
                  <div className="flex gap-0.5 rounded-lg border border-[var(--border)] p-0.5">
                    {ranges.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRange(r)}
                        className={`rounded-md px-2 py-1 text-[11px] ${
                          range === r
                            ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                            : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <PortfolioGrowthChart
                data={portfolioYearHistory}
                series={chartSeries}
              />

              <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span aria-hidden>⏱</span>
                Marktpreise zuletzt aktualisiert: {a.pricesUpdatedLabel}
              </p>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">Portfolio-Aufteilung</h2>
                  <div className="flex flex-wrap gap-0.5 rounded-lg border border-[var(--border)] p-0.5">
                    {(
                      [
                        ["assetType", "Asset-Typ"],
                        ["set", "Set"],
                        ["language", "Sprache"],
                        ["condition", "Zustand"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setAllocDim(id)}
                        className={`rounded-md px-2 py-1 text-[10px] ${
                          allocDim === id
                            ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <DonutChart
                  segments={portfolioAllocationBy[allocDim]}
                  size={128}
                  centerLabel={formatCurrency(metrics.totalValue)}
                  centerSub="Gesamtwert"
                />
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                <h2 className="mb-3 text-sm font-medium">Portfolio-Kennzahlen</h2>
                <div className="grid grid-cols-2 gap-2">
                  <KpiTile
                    label="Größte Position"
                    value={formatCurrency(a.largestPosition)}
                    icon="star"
                  />
                  <KpiTile
                    label="Beste Rendite"
                    value={formatPercent(a.bestReturnPct)}
                    icon="up"
                    positive
                  />
                  <KpiTile
                    label="Stärkster Verlust"
                    value={formatPercent(a.worstReturnPct)}
                    icon="down"
                    negative
                  />
                  <KpiTile
                    label="Verschiedene Assets"
                    value={String(a.distinctAssets)}
                    icon="box"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Performance + positions */}
          <div className="mb-5 grid gap-5 xl:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Performance nach Asset-Typ</h2>
                <div className="flex gap-3 text-xs font-medium">
                  <Link
                    href="/assets/karten"
                    className="text-[var(--accent)] hover:opacity-80"
                  >
                    Karten →
                  </Link>
                  <Link
                    href="/assets/sealed"
                    className="text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Sealed →
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <th className="pb-2 font-medium">Asset-Typ</th>
                      <th className="pb-2 text-right font-medium">Marktwert</th>
                      <th className="pb-2 text-right font-medium">Investiert</th>
                      <th className="pb-2 text-right font-medium">Gewinn / Verlust</th>
                      <th className="pb-2 text-right font-medium">Rendite</th>
                      <th className="pb-2 pl-3 font-medium">Portfolio-Anteil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {portfolioAssetPerformance.map((row) => (
                      <tr key={row.type}>
                        <td className="py-3">
                          <Link
                            href={
                              row.type.toLowerCase().includes("sealed")
                                ? "/assets/sealed"
                                : "/assets/karten"
                            }
                            className="inline-flex items-center gap-2 hover:text-[var(--accent)]"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: row.color }}
                            />
                            {row.type}
                          </Link>
                        </td>
                        <td className="tabular-nums py-3 text-right">
                          {formatCurrency(row.market)}
                        </td>
                        <td className="tabular-nums py-3 text-right text-[var(--muted)]">
                          {formatCurrency(row.invested)}
                        </td>
                        <td className="tabular-nums py-3 text-right text-[var(--positive)]">
                          +{formatCurrency(row.profit)}
                        </td>
                        <td className="tabular-nums py-3 text-right text-[var(--positive)]">
                          +{row.returnPct.toLocaleString("de-DE")} %
                        </td>
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${row.share}%`,
                                  backgroundColor: row.color,
                                }}
                              />
                            </div>
                            <span className="tabular-nums w-8 text-right text-xs text-[var(--muted)]">
                              {row.share} %
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-3">Gesamt</td>
                      <td className="tabular-nums py-3 text-right">
                        {formatCurrency(a.totalValue)}
                      </td>
                      <td className="tabular-nums py-3 text-right text-[var(--muted)]">
                        {formatCurrency(a.invested)}
                      </td>
                      <td className="tabular-nums py-3 text-right text-[var(--positive)]">
                        +{formatCurrency(a.unrealizedProfit + a.realizedProfit)}
                      </td>
                      <td className="tabular-nums py-3 text-right text-[var(--positive)]">
                        +{a.totalReturnRate.toLocaleString("de-DE")} %
                      </td>
                      <td className="py-3 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                            <div
                              className="h-full w-full rounded-full bg-[var(--accent)]"
                            />
                          </div>
                          <span className="tabular-nums w-8 text-right text-xs text-[var(--muted)]">
                            100 %
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium">Wertvollste Positionen</h2>
                <Link
                  href="/portfolio/positionen"
                  className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
                >
                  Alle →
                </Link>
              </div>
              <ul className="space-y-1">
                {valuablePositions.map((pos, i) => {
                  const card = getCard(pos.cardId);
                  const name = pos.name ?? card.name;
                  const dest =
                    pos.kind === "Sealed"
                      ? "/assets/sealed"
                      : "/portfolio/positionen";
                  return (
                    <li key={pos.cardId}>
                      <Link
                        href={dest}
                        className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/60"
                      >
                        <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                          {i + 1}
                        </span>
                        <CardImage src={card.imageUrl} alt={name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {pos.setCode}
                          </p>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            pos.kind === "Sealed"
                              ? "bg-violet-500/15 text-violet-300"
                              : "bg-[var(--accent-soft)] text-[var(--accent)]"
                          }`}
                        >
                          {pos.kind}
                        </span>
                        <div className="text-right">
                          <p className="tabular-nums text-sm font-medium">
                            {formatCurrency(pos.market)}
                          </p>
                          <p className="tabular-nums text-[10px] text-[var(--muted)]">
                            {pos.sharePct.toLocaleString("de-DE")} %
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/portfolio/positionen"
                className="mt-4 inline-block text-xs font-medium text-[var(--accent)] hover:opacity-80"
              >
                Alle Positionen anzeigen →
              </Link>
            </div>
          </div>

          {/* Cashflow + transactions */}
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Käufe &amp; Verkäufe</h2>
                <div className="flex gap-3 text-[11px] text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-pink-400/80" />
                    Käufe
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-emerald-400/80" />
                    Verkäufe
                  </span>
                </div>
              </div>
              <CashflowChart data={portfolioCashflow} />
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium">Letzte Transaktionen</h2>
                <button
                  type="button"
                  onClick={() => setTab("transaktionen")}
                  className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
                >
                  Alle Transaktionen →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <th className="pb-2 text-left font-medium">Datum</th>
                      <th className="pb-2 text-left font-medium">Typ</th>
                      <th className="pb-2 text-left font-medium">Position</th>
                      <th className="pb-2 text-right font-medium">Anzahl</th>
                      <th className="pb-2 text-right font-medium">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {portfolioTransactions.map((tx) => {
                      const card = getCard(tx.cardId);
                      const name = tx.name ?? card.name;
                      const sell = tx.total < 0;
                      return (
                        <tr key={tx.id}>
                          <td className="py-2.5 text-[var(--muted)]">{tx.date}</td>
                          <td className="py-2.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                                tx.type === "Verkauf"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-[var(--accent-soft)] text-[var(--accent)]"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <CardImage src={card.imageUrl} alt={name} size="sm" />
                              <span className="truncate">{name}</span>
                            </div>
                          </td>
                          <td className="tabular-nums py-2.5 text-right">
                            {tx.qty}
                          </td>
                          <td
                            className={`tabular-nums py-2.5 text-right font-medium ${
                              sell ? "text-[var(--negative)]" : ""
                            }`}
                          >
                            {sell ? "−" : ""}
                            {formatCurrency(Math.abs(tx.total))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "analyse" && <PortfolioAnalyse />}

      {tab === "transaktionen" && <PortfolioTransactions />}
    </div>
  );
}

/* ── Charts ─────────────────────────────────────────────── */

function PortfolioGrowthChart({
  data,
  series,
}: {
  data: PortfolioHistoryPoint[];
  series: ChartSeries;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 720;
  const height = 260;
  const pad = { top: 16, right: 16, bottom: 32, left: 48 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const marketKey =
    series === "karten" ? "cards" : series === "sealed" ? "sealed" : "market";

  const values = data.flatMap((d) => [
    d[marketKey as "market" | "cards" | "sealed"],
    d.invested * (series === "gesamt" ? 1 : series === "karten" ? 0.64 : 0.36),
  ]);
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.06;
  const span = Math.max(max - min, 1);

  const mapped = data.map((d, i) => {
    const market = d[marketKey as "market" | "cards" | "sealed"];
    const invested =
      series === "gesamt"
        ? d.invested
        : series === "karten"
          ? Math.round(d.invested * 0.64)
          : Math.round(d.invested * 0.36);
    const x = pad.left + (i / (data.length - 1)) * cw;
    const yM = pad.top + ch - ((market - min) / span) * ch;
    const yI = pad.top + ch - ((invested - min) / span) * ch;
    return { ...d, market, invested, x, yM, yI };
  });

  const marketPath = mapped
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yM}`)
    .join(" ");
  const investedPath = mapped
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yI}`)
    .join(" ");
  const areaPath = `${marketPath} L ${mapped[mapped.length - 1].x} ${
    pad.top + ch
  } L ${mapped[0].x} ${pad.top + ch} Z`;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let dist = Infinity;
    mapped.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  }

  const h = hover != null ? mapped[hover] : null;
  const profit = h ? h.market - h.invested : 0;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="pfArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = pad.top + ch * r;
          const val = max - span * r;
          return (
            <g key={r}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="var(--border)"
              />
              <text
                x={pad.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-[var(--muted)] text-[10px]"
              >
                {(val / 1000).toLocaleString("de-DE", {
                  maximumFractionDigits: 0,
                })}
                k €
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#pfArea)" />
        <path
          d={investedPath}
          fill="none"
          stroke="#a1a1aa"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinecap="round"
        />
        <path
          d={marketPath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {mapped.map((p, i) =>
          i % 2 === 0 || i === mapped.length - 1 ? (
            <text
              key={p.date}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-[var(--muted)] text-[10px]"
            >
              {p.label}
            </text>
          ) : null,
        )}
        {h && (
          <g>
            <line
              x1={h.x}
              y1={pad.top}
              x2={h.x}
              y2={pad.top + ch}
              stroke="var(--border-strong)"
              strokeDasharray="3 3"
            />
            <circle
              cx={h.x}
              cy={h.yM}
              r="5"
              fill="var(--background)"
              stroke="var(--accent)"
              strokeWidth="2.5"
            />
            <circle
              cx={h.x}
              cy={h.yI}
              r="4"
              fill="var(--background)"
              stroke="#a1a1aa"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute z-10 min-w-[11rem] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-3 py-2 text-xs shadow-lg"
          style={{
            left: `clamp(0.5rem, ${(h.x / width) * 100}% - 5.5rem, calc(100% - 12rem))`,
            top: 8,
          }}
        >
          <p className="font-medium">
            {new Date(h.date + "T12:00:00").toLocaleDateString("de-DE", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            })}
          </p>
          <div className="mt-1.5 space-y-1">
            <Row label="Marktwert" value={formatCurrency(h.market)} />
            <Row label="Invest. Kapital" value={formatCurrency(h.invested)} />
            <Row
              label="Gewinn"
              value={`+${formatCurrency(profit)}`}
              positive
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CashflowChart({
  data,
}: {
  data: { label: string; buys: number; sells: number }[];
}) {
  const max = Math.max(...data.flatMap((d) => [d.buys, d.sells])) * 1.15;
  const h = 160;

  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-end justify-center gap-0.5" style={{ height: h }}>
              <div
                className="w-[45%] rounded-t-sm bg-pink-400/80"
                style={{ height: `${(d.buys / max) * h}px` }}
                title={`Käufe ${d.buys}`}
              />
              <div
                className="w-[45%] rounded-t-sm bg-emerald-400/75"
                style={{ height: `${(d.sells / max) * h}px` }}
                title={`Verkäufe ${d.sells}`}
              />
            </div>
            <span className="text-[9px] text-[var(--muted)] sm:text-[10px]">
              {d.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[var(--muted)]">
        <span>−2.500 €</span>
        <span>0 €</span>
        <span>2.500 €</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--muted)]">{label}</span>
      <span
        className={`tabular-nums font-medium ${
          positive ? "text-[var(--positive)]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Metric tiles ───────────────────────────────────────── */

function PrimaryMetric({
  icon,
  label,
  value,
  hint,
  positive,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        <MetricIcon type={icon} />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
          <InfoDot />
        </p>
        <p
          className={`tabular-nums mt-0.5 text-lg font-semibold tracking-tight ${
            positive ? "text-[var(--positive)]" : ""
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

function SecondaryMetric({
  icon,
  label,
  value,
  positive,
}: {
  icon: string;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]">
        <MetricIcon type={icon} />
      </span>
      <div>
        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
          <InfoDot />
        </p>
        <p
          className={`tabular-nums text-base font-semibold ${
            positive ? "text-[var(--positive)]" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
  positive,
  negative,
}: {
  label: string;
  value: string;
  icon: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/40 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
        <MetricIcon type={icon} />
        {label}
      </p>
      <p
        className={`tabular-nums mt-1 text-sm font-semibold ${
          positive
            ? "text-[var(--positive)]"
            : negative
              ? "text-[var(--negative)]"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent,
  size = "md",
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full font-medium transition-colors ${
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
            } ${
              active
                ? accent
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function InfoDot() {
  return (
    <span
      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px] text-[var(--muted)]"
      aria-hidden
    >
      i
    </span>
  );
}

function MetricIcon({ type }: { type: string }) {
  const p = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
  } as const;
  switch (type) {
    case "doc":
      return (
        <svg {...p}>
          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M14 3v5h5" />
        </svg>
      );
    case "coins":
      return (
        <svg {...p}>
          <ellipse cx="12" cy="7" rx="7" ry="3" />
          <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
        </svg>
      );
    case "trend":
      return (
        <svg {...p}>
          <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" />
          <path d="M15 5h5v5" strokeLinecap="round" />
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
    case "tag":
      return (
        <svg {...p}>
          <path d="M20 12 12 4H5v7l8 8 7-7Z" />
        </svg>
      );
    case "price":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v10M9.5 9.5c.5-1 1.5-1.5 2.5-1.5s2 .7 2 1.8c0 2.2-4 1.5-4 3.7 0 1 .9 1.7 2 1.7s1.9-.4 2.4-1.2" strokeLinecap="round" />
        </svg>
      );
    case "clock":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" strokeLinecap="round" />
        </svg>
      );
    case "bars":
      return (
        <svg {...p}>
          <path d="M4 18h4V10H4zM10 18h4V6h-4zM16 18h4v-8h-4z" />
        </svg>
      );
    case "star":
      return (
        <svg {...p}>
          <path d="M12 3l2.4 5.4 5.9.5-4.5 3.9 1.4 5.7L12 15.8 6.8 18.5l1.4-5.7L3.7 8.9l5.9-.5L12 3z" />
        </svg>
      );
    case "up":
      return (
        <svg {...p}>
          <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "down":
      return (
        <svg {...p}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "box":
      return (
        <svg {...p}>
          <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
        </svg>
      );
    default:
      return null;
  }
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
