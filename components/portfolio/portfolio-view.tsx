"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DonutChart } from "@/components/charts/donut-chart";
import { CardImage } from "@/components/ui/card-image";
import { InfoTip } from "@/components/ui/metric-card";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  usePortfolioAssets,
  type LiveHistoryPoint,
  type LivePosition,
} from "@/hooks/use-portfolio-assets";

type Scope = "gesamt" | "karten" | "sealed";
type Range = "1W" | "1M" | "3M" | "6M" | "1J" | "MAX";
type AllocDim = "assetType" | "set" | "language" | "condition";
type ChartSeries = "gesamt" | "karten" | "sealed";

const ranges: Range[] = ["1W", "1M", "3M", "6M", "1J", "MAX"];

export function PortfolioView() {
  const [scope, setScope] = useState<Scope>("gesamt");
  const [range, setRange] = useState<Range>("1J");
  const [chartSeries, setChartSeries] = useState<ChartSeries>("gesamt");
  const [allocDim, setAllocDim] = useState<AllocDim>("assetType");
  const live = usePortfolioAssets();

  const metrics = useMemo(() => {
    if (scope === "karten") {
      const unrealized = live.cardsValue - live.cardsInvested;
      return {
        totalValue: live.cardsValue,
        invested: live.cardsInvested,
        unrealized,
        returnRate:
          live.cardsInvested > 0
            ? (unrealized / live.cardsInvested) * 100
            : live.cardsValue > 0
              ? 100
              : 0,
        weeklyChange: 0,
        valueLabel: "Kartenwert",
        returnLabel: "Karten-Rendite",
      };
    }
    if (scope === "sealed") {
      const unrealized = live.sealedValue - live.sealedInvested;
      return {
        totalValue: live.sealedValue,
        invested: live.sealedInvested,
        unrealized,
        returnRate:
          live.sealedInvested > 0
            ? (unrealized / live.sealedInvested) * 100
            : live.sealedValue > 0
              ? 100
              : 0,
        weeklyChange: 0,
        valueLabel: "Sealed-Wert",
        returnLabel: "Sealed-Rendite",
      };
    }
    return {
      totalValue: live.totalValue,
      invested: live.invested,
      unrealized: live.unrealized,
      returnRate: live.returnRate,
      weeklyChange: 0,
      valueLabel: "Gesamtwert",
      returnLabel: "Gesamtrendite",
    };
  }, [scope, live]);

  const assetPerformance = useMemo(() => {
    const total = live.totalValue || 1;
    return [
      {
        type: "Karten" as const,
        market: live.cardsValue,
        invested: live.cardsInvested,
        profit: Math.round((live.cardsValue - live.cardsInvested) * 100) / 100,
        returnPct:
          live.cardsInvested > 0
            ? Math.round(
                ((live.cardsValue - live.cardsInvested) / live.cardsInvested) *
                  1000,
              ) / 10
            : 0,
        share:
          Math.round((live.cardsValue / total) * 1000) / 10 || 0,
        color: "#f472b6",
      },
      {
        type: "Sealed" as const,
        market: live.sealedValue,
        invested: live.sealedInvested,
        profit:
          Math.round((live.sealedValue - live.sealedInvested) * 100) / 100,
        returnPct:
          live.sealedInvested > 0
            ? Math.round(
                ((live.sealedValue - live.sealedInvested) /
                  live.sealedInvested) *
                  1000,
              ) / 10
            : 0,
        share:
          Math.round((live.sealedValue / total) * 1000) / 10 || 0,
        color: "#a78bfa",
      },
    ];
  }, [live]);

  /** Monthly buy bars from live assets (sells 0 until sales are tracked). */
  const liveCashflow = useMemo(() => {
    const map = new Map<string, { buys: number; sells: number }>();
    // Last 12 calendar months as buckets
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, { buys: 0, sells: 0 });
    }
    for (const p of live.positions) {
      if (!p.purchaseDate || p.invested <= 0) continue;
      const key = p.purchaseDate.slice(0, 7);
      if (!map.has(key)) continue;
      const row = map.get(key)!;
      row.buys += p.invested;
    }
    return [...map.entries()].map(([key, v]) => {
      const [y, mo] = key.split("-");
      const d = new Date(Number(y), Number(mo) - 1, 1);
      return {
        label: d.toLocaleDateString("de-DE", {
          month: "short",
          year: "2-digit",
        }),
        buys: Math.round(v.buys * 100) / 100,
        sells: Math.round(v.sells * 100) / 100,
      };
    });
  }, [live.positions]);

  // Keep chart series toggle in sync with header scope
  useEffect(() => {
    setChartSeries(scope);
  }, [scope]);

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
        </div>
      </div>

      <>
          {/* All KPI boxes in one row (wraps on smaller screens) */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <PrimaryMetric
              icon="doc"
              label={metrics.valueLabel}
              value={formatCurrency(metrics.totalValue)}
              hint={`${metrics.weeklyChange >= 0 ? "+" : ""}${metrics.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
              positive={metrics.weeklyChange >= 0}
              infoText="Aktueller Marktwert im gewählten Bereich (Gesamt / Karten / Sealed)."
            />
            <PrimaryMetric
              icon="coins"
              label="Investiert"
              value={formatCurrency(metrics.invested)}
              infoText="Summe der Einkaufspreise (EK) im gewählten Bereich."
            />
            <PrimaryMetric
              icon="trend"
              label="Unrealisierter Gewinn"
              value={`${metrics.unrealized >= 0 ? "+" : ""}${formatCurrency(metrics.unrealized)}`}
              positive={metrics.unrealized >= 0}
              infoText="Marktwert minus Einkaufspreis bei noch gehaltenen Assets."
            />
            <PrimaryMetric
              icon="pct"
              label={metrics.returnLabel}
              value={formatPercent(metrics.returnRate)}
              positive={metrics.returnRate >= 0}
              infoText="Prozentuale Performance: (Marktwert − Investiert) ÷ Investiert."
            />
            <PrimaryMetric
              icon="tag"
              label="Realisierter Gewinn"
              value={formatCurrency(0)}
              positive
              infoText="Gewinn aus bereits verkauften Positionen."
            />
            <PrimaryMetric
              icon="bars"
              label="Top-5-Anteil"
              value={`${live.topPositions.length ? Math.min(100, Math.round((live.topPositions.reduce((s,p)=>s+p.market,0)/(live.totalValue||1))*1000)/10) : 0} %`}
              infoText="Anteil der fünf wertvollsten Positionen am Gesamtwert."
            />
          </div>

          {/* Chart + allocation */}
          <div className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="flex h-full min-h-[22rem] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
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
                        className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
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
                data={live.history}
                series={chartSeries}
                range={range}
                cardsInvested={live.cardsInvested}
                sealedInvested={live.sealedInvested}
              />

              <p className="mt-3 flex shrink-0 items-center gap-1.5 text-xs text-[var(--muted)]">
                <span aria-hidden>⏱</span>
                Nur Assets → Karten & Sealed · aktuelle Marktwerte
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
                <div className="flex flex-col items-center gap-4">
                  <DonutChart
                    segments={live.allocationBy[allocDim]}
                    size={172}
                    ringWidth={28}
                    hideLegend
                    centerLabel="Gesamtwert"
                    centerSub={formatCurrency(metrics.totalValue)}
                  />
                  <div className="w-full space-y-2">
                    {live.allocationBy[allocDim].length === 0 ? (
                      <p className="text-center text-xs text-[var(--muted)]">
                        Noch keine Assets in Karten oder Sealed.
                      </p>
                    ) : (
                      live.allocationBy[allocDim].map((s) => (
                        <div
                          key={s.label}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="truncate">{s.label}</span>
                          </span>
                          <span className="tabular-nums shrink-0 font-medium">
                            {s.percent} %
                            <span className="ml-2 text-[var(--muted)]">
                              {formatCurrency(s.value)}
                            </span>
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                <h2 className="mb-3 text-sm font-medium">Portfolio-Kennzahlen</h2>
                <div className="grid grid-cols-2 gap-2">
                  <KpiTile
                    label="Wertvollste Position"
                    value={formatCurrency(live.topPositions[0]?.market ?? 0)}
                    icon="star"
                    hoverPosition={live.topPositions[0] ?? null}
                    href={live.topPositions[0]?.href ?? "/assets/karten"}
                  />
                  <KpiTile
                    label="Beste Rendite"
                    value={formatPercent(live.bestReturn?.returnPct ?? 0)}
                    icon="up"
                    positive={(live.bestReturn?.returnPct ?? 0) >= 0}
                    hoverPosition={live.bestReturn}
                    href={live.bestReturn?.href ?? "/assets/karten"}
                  />
                  <KpiTile
                    label="Stärkster Verlust"
                    value={formatPercent(live.worstReturn?.returnPct ?? 0)}
                    icon="down"
                    negative={(live.worstReturn?.returnPct ?? 0) < 0}
                    hoverPosition={live.worstReturn}
                    href={live.worstReturn?.href ?? "/assets/karten"}
                  />
                  <KpiTile
                    label="Verschiedene Assets"
                    value={String(live.cardsUnique + live.sealedProducts)}
                    icon="box"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 1: Wertvollste Positionen | Letzte Transaktionen — equal height */}
          <div className="mb-5 grid gap-5 xl:grid-cols-2 xl:items-stretch">
            <div className="flex h-full min-h-[14rem] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-2.5 flex shrink-0 items-center justify-between">
                <h2 className="text-sm font-medium">Wertvollste Positionen</h2>
                <Link
                  href="/portfolio/positionen"
                  className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
                >
                  Alle →
                </Link>
              </div>
              <ul className="flex min-h-0 flex-1 flex-col space-y-0.5">
                {live.topPositions.map((pos, i) => (
                  <li key={pos.id}>
                    <Link
                      href={pos.href}
                      className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/60"
                    >
                      <span className="tabular-nums w-4 shrink-0 text-xs text-[var(--muted)]">
                        {i + 1}
                      </span>
                      <CardImage
                        src={pos.imageUrl ?? ""}
                        fallbacks={pos.imageFallbacks}
                        alt={pos.name}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{pos.name}</p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {pos.setName}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          pos.kind === "Sealed"
                            ? "bg-violet-500/15 text-violet-300"
                            : "bg-[var(--accent-soft)] text-[var(--accent)]"
                        }`}
                      >
                        {pos.kind}
                      </span>
                      <p className="tabular-nums w-[5.5rem] shrink-0 text-right text-sm font-medium">
                        {formatCurrency(pos.market)}
                      </p>
                    </Link>
                  </li>
                ))}
                {live.topPositions.length === 0 && (
                  <li className="flex flex-1 items-center justify-center px-1 py-6 text-center text-xs text-[var(--muted)]">
                    Noch keine Assets in Karten oder Sealed.
                  </li>
                )}
              </ul>
            </div>

            <div className="flex h-full min-h-[14rem] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-2.5 flex shrink-0 items-center justify-between">
                <h2 className="text-sm font-medium">Letzte Transaktionen</h2>
                <Link
                  href="/portfolio/transaktionen"
                  className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
                >
                  Alle Transaktionen →
                </Link>
              </div>
              <div className="min-h-0 flex-1 overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <th className="pb-2 pr-2 text-left font-medium">Datum</th>
                      <th className="pb-2 pr-2 text-left font-medium">Typ</th>
                      <th className="pb-2 pr-2 text-left font-medium">
                        Position
                      </th>
                      <th className="pb-2 pr-2 text-right font-medium">Anz.</th>
                      <th className="pb-2 text-right font-medium">Gesamt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {[...live.positions]
                      .filter((p) => p.invested > 0 || p.market > 0)
                      .sort((a, b) => {
                        const da = a.purchaseDate ?? "";
                        const db = b.purchaseDate ?? "";
                        return db.localeCompare(da);
                      })
                      .slice(0, 5)
                      .map((pos) => (
                        <tr key={pos.id}>
                          <td className="whitespace-nowrap py-2 pr-2 text-xs text-[var(--muted)]">
                            {pos.purchaseDate
                              ? new Date(pos.purchaseDate).toLocaleDateString(
                                  "de-DE",
                                )
                              : "—"}
                          </td>
                          <td className="py-2 pr-2">
                            <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                              Kauf
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <Link
                              href={pos.href}
                              className="flex min-w-0 max-w-[11rem] items-center gap-2 hover:opacity-90"
                            >
                              <CardImage
                                src={pos.imageUrl ?? ""}
                                fallbacks={pos.imageFallbacks}
                                alt={pos.name}
                                size="sm"
                              />
                              <span className="truncate text-sm">
                                {pos.name}
                              </span>
                            </Link>
                          </td>
                          <td className="tabular-nums py-2 pr-2 text-right">
                            {pos.quantity}
                          </td>
                          <td className="tabular-nums py-2 text-right font-medium">
                            {formatCurrency(pos.invested || pos.market)}
                          </td>
                        </tr>
                      ))}
                    {live.positions.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-10 text-center text-xs text-[var(--muted)]"
                        >
                          Noch keine Assets in Karten oder Sealed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Row 2: Performance | Käufe & Verkäufe — equal height */}
          <div className="mb-5 grid gap-5 xl:grid-cols-2 xl:items-stretch">
            <div className="flex h-full min-h-[14rem] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <h2 className="mb-2.5 shrink-0 text-sm font-medium">
                Performance nach Asset-Typ
              </h2>
              <div className="min-h-0 flex-1 overflow-x-auto">
                <table className="w-full min-w-[520px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[27%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <th className="px-1.5 pb-2 pt-0 font-medium">Asset-Typ</th>
                      <th className="px-1.5 pb-2 pt-0 text-right font-medium">
                        Marktwert
                      </th>
                      <th className="px-1.5 pb-2 pt-0 text-right font-medium">
                        Investiert
                      </th>
                      <th className="px-1.5 pb-2 pt-0 text-right font-medium">
                        G/V
                      </th>
                      <th className="px-1.5 pb-2 pt-0 text-right font-medium">
                        Rendite
                      </th>
                      <th className="px-1.5 pb-2 pt-0 font-medium">Anteil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {assetPerformance.map((row) => (
                      <tr key={row.type}>
                        <td className="px-1.5 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: row.color }}
                            />
                            {row.type}
                          </span>
                        </td>
                        <td className="tabular-nums px-1.5 py-2.5 text-right">
                          {formatCurrency(row.market)}
                        </td>
                        <td className="tabular-nums px-1.5 py-2.5 text-right text-[var(--muted)]">
                          {formatCurrency(row.invested)}
                        </td>
                        <td
                          className={`tabular-nums px-1.5 py-2.5 text-right ${
                            row.profit >= 0
                              ? "text-[var(--positive)]"
                              : "text-[var(--negative)]"
                          }`}
                        >
                          {row.profit >= 0 ? "+" : ""}
                          {formatCurrency(row.profit)}
                        </td>
                        <td
                          className={`tabular-nums px-1.5 py-2.5 text-right ${
                            row.returnPct >= 0
                              ? "text-[var(--positive)]"
                              : "text-[var(--negative)]"
                          }`}
                        >
                          {row.returnPct >= 0 ? "+" : ""}
                          {row.returnPct.toLocaleString("de-DE")} %
                        </td>
                        <td className="px-1.5 py-2.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${row.share}%`,
                                  backgroundColor: row.color,
                                }}
                              />
                            </div>
                            <span className="tabular-nums w-9 shrink-0 text-right text-xs text-[var(--muted)]">
                              {row.share} %
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="px-1.5 py-2.5">Gesamt</td>
                      <td className="tabular-nums px-1.5 py-2.5 text-right">
                        {formatCurrency(live.totalValue)}
                      </td>
                      <td className="tabular-nums px-1.5 py-2.5 text-right text-[var(--muted)]">
                        {formatCurrency(live.invested)}
                      </td>
                      <td
                        className={`tabular-nums px-1.5 py-2.5 text-right ${
                          live.unrealized >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }`}
                      >
                        {live.unrealized >= 0 ? "+" : ""}
                        {formatCurrency(live.unrealized)}
                      </td>
                      <td
                        className={`tabular-nums px-1.5 py-2.5 text-right ${
                          live.returnRate >= 0
                            ? "text-[var(--positive)]"
                            : "text-[var(--negative)]"
                        }`}
                      >
                        {live.returnRate >= 0 ? "+" : ""}
                        {live.returnRate.toLocaleString("de-DE")} %
                      </td>
                      <td className="px-1.5 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                            <div className="h-full w-full rounded-full bg-[var(--accent)]" />
                          </div>
                          <span className="tabular-nums w-9 shrink-0 text-right text-xs text-[var(--muted)]">
                            100 %
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex h-full min-h-[14rem] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <div className="mb-2.5 flex shrink-0 flex-wrap items-center justify-between gap-2">
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
              <div className="flex min-h-0 flex-1 flex-col justify-end">
                <CashflowChart data={liveCashflow} />
              </div>
            </div>
          </div>
        </>
    </div>
  );
}

/* ── Charts ─────────────────────────────────────────────── */

const PORTFOLIO_RANGE_DAYS: Record<Range, number | null> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1J": 365,
  MAX: null,
};

function filterPortfolioRange(
  data: LiveHistoryPoint[],
  range: Range,
): LiveHistoryPoint[] {
  if (!data.length) return data;
  const days = PORTFOLIO_RANGE_DAYS[range];
  if (days == null) return data;
  const last = data[data.length - 1];
  const end = new Date(`${last.date}T12:00:00`);
  if (Number.isNaN(end.getTime())) {
    return data.length <= days ? data : data.slice(-days);
  }
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const startIso = start.toISOString().slice(0, 10);
  const filtered = data.filter((p) => p.date >= startIso);
  return filtered.length ? filtered : data.slice(-1);
}

function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const out: T[] = [];
  const last = points.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / (maxPoints - 1)) * last);
    if (!out.length || out[out.length - 1] !== points[idx]) {
      out.push(points[idx]);
    }
  }
  if (out[out.length - 1] !== points[last]) out.push(points[last]);
  return out;
}

function PortfolioGrowthChart({
  data,
  series,
  range,
  cardsInvested,
  sealedInvested,
}: {
  data: LiveHistoryPoint[];
  series: ChartSeries;
  range: Range;
  cardsInvested: number;
  sealedInvested: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 260 });

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setSize({
        w: Math.max(280, Math.round(r.width)),
        h: Math.max(220, Math.round(r.height)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = size.w;
  const height = size.h;
  const pad = { top: 16, right: 16, bottom: 32, left: 48 };
  const cw = Math.max(1, width - pad.left - pad.right);
  const ch = Math.max(1, height - pad.top - pad.bottom);

  const marketKey =
    series === "karten" ? "cards" : series === "sealed" ? "sealed" : "market";

  const filtered = useMemo(() => {
    const f = filterPortfolioRange(data, range);
    const maxPts =
      range === "1W" ? 60 : range === "1M" ? 90 : range === "3M" ? 120 : 160;
    return downsamplePoints(f, maxPts);
  }, [data, range]);

  const totalInv = cardsInvested + sealedInvested;
  const cardsShare = totalInv > 0 ? cardsInvested / totalInv : 0.5;
  const sealedShare = totalInv > 0 ? sealedInvested / totalInv : 0.5;

  const values = filtered.flatMap((d) => [
    d[marketKey as "market" | "cards" | "sealed"],
    series === "gesamt"
      ? d.invested
      : series === "karten"
        ? d.invested * cardsShare
        : d.invested * sealedShare,
  ]);
  const min = (values.length ? Math.min(...values) : 0) * 0.9;
  const max = (values.length ? Math.max(...values) : 1) * 1.06;
  const span = Math.max(max - min, 1);

  const mapped = filtered.map((d, i) => {
    const market = d[marketKey as "market" | "cards" | "sealed"];
    const invested =
      series === "gesamt"
        ? d.invested
        : series === "karten"
          ? Math.round(d.invested * cardsShare * 100) / 100
          : Math.round(d.invested * sealedShare * 100) / 100;
    const x =
      filtered.length === 1
        ? pad.left + cw / 2
        : pad.left + (i / (filtered.length - 1)) * cw;
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
  const areaPath =
    mapped.length > 0
      ? `${marketPath} L ${mapped[mapped.length - 1].x} ${
          pad.top + ch
        } L ${mapped[0].x} ${pad.top + ch} Z`
      : "";

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
  const labelStep = Math.max(1, Math.ceil(mapped.length / 6));

  return (
    <div ref={bodyRef} className="relative min-h-[14rem] w-full flex-1">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full cursor-crosshair"
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
          i % labelStep === 0 || i === mapped.length - 1 ? (
            <text
              key={`${p.date}-${i}`}
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
  const [hover, setHover] = useState<number | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const max = Math.max(...data.flatMap((d) => [d.buys, d.sells]), 1) * 1.15;
  const h = 160;

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
      <div className="flex h-44 items-end gap-1.5 sm:gap-2">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex flex-1 flex-col items-center gap-1"
            onMouseEnter={(e) => trackMouse(e, i)}
            onMouseMove={(e) => trackMouse(e, i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className="flex w-full items-end justify-center gap-0.5"
              style={{ height: h }}
            >
              <div
                className="w-[45%] rounded-t-sm bg-pink-400/80 transition-opacity"
                style={{
                  height: `${Math.max(4, (d.buys / max) * h)}px`,
                  opacity: hover == null || hover === i ? 1 : 0.45,
                }}
              />
              <div
                className="w-[45%] rounded-t-sm bg-emerald-400/75 transition-opacity"
                style={{
                  height: `${Math.max(4, (d.sells / max) * h)}px`,
                  opacity: hover == null || hover === i ? 1 : 0.45,
                }}
              />
            </div>
            <span className="text-[9px] text-[var(--muted)] sm:text-[10px]">
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {hover != null && data[hover] && (
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
          <p className="font-medium">{data[hover].label}</p>
          <div className="mt-1.5 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-pink-300">
                <span className="h-2 w-2 rounded-sm bg-pink-400" />
                Käufe
              </span>
              <span className="tabular-nums font-medium">
                −{formatCurrency(data[hover].buys)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <span className="h-2 w-2 rounded-sm bg-emerald-400" />
                Verkäufe
              </span>
              <span className="tabular-nums font-medium">
                {formatCurrency(data[hover].sells)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-1">
              <span className="text-[var(--muted)]">Netto</span>
              <span
                className={`tabular-nums font-medium ${
                  data[hover].sells - data[hover].buys >= 0
                    ? "text-[var(--positive)]"
                    : "text-[var(--negative)]"
                }`}
              >
                {data[hover].sells - data[hover].buys >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(data[hover].sells - data[hover].buys))}
              </span>
            </div>
          </div>
        </div>
      )}
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
  infoText,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  infoText?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        <MetricIcon type={icon} />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
          {infoText && <InfoTip text={infoText} />}
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
  infoText,
}: {
  icon: string;
  label: string;
  value: string;
  positive?: boolean;
  infoText?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]">
        <MetricIcon type={icon} />
      </span>
      <div>
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
          {infoText && <InfoTip text={infoText} />}
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
  hoverPosition,
  href,
}: {
  label: string;
  value: string;
  icon: string;
  positive?: boolean;
  negative?: boolean;
  /** Live asset preview on hover */
  hoverPosition?: LivePosition | null;
  href?: string;
}) {
  const [open, setOpen] = useState(false);
  const pos = hoverPosition ?? null;
  const interactive = Boolean(pos);

  const body = (
    <>
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
    </>
  );

  const shellClass = `relative rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/40 px-3 py-2.5 transition-colors ${
    interactive
      ? "cursor-pointer hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/25"
      : ""
  }`;

  return (
    <div
      className={shellClass}
      onMouseEnter={() => interactive && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {href && interactive ? (
        <Link href={href} className="block outline-none">
          {body}
        </Link>
      ) : (
        body
      )}

      {open && pos && (
        <div
          className="absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 w-[13.5rem] -translate-x-1/2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-3 shadow-xl"
          role="tooltip"
        >
          <div className="flex gap-2.5">
            <CardImage
              src={pos.imageUrl ?? ""}
              fallbacks={pos.imageFallbacks}
              alt={pos.name}
              size="sm"
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                {pos.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                {pos.setName}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                {pos.kind}
                {pos.condition ? ` · ${pos.condition}` : ""}
              </p>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
            <div className="rounded-lg bg-[var(--background)] px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Marktwert
              </p>
              <p className="tabular-nums font-semibold">
                {formatCurrency(pos.market)}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--background)] px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Rendite
              </p>
              <p
                className={`tabular-nums font-semibold ${
                  pos.returnPct < 0
                    ? "text-[var(--negative)]"
                    : "text-[var(--positive)]"
                }`}
              >
                {formatPercent(pos.returnPct)}
              </p>
            </div>
          </div>
          {href && (
            <p className="mt-2 text-center text-[10px] text-[var(--muted)]">
              Klicken → Assets
            </p>
          )}
        </div>
      )}
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

function MetricIcon({ type }: { type: string }) {
  const p = {
    width: 20,
    height: 20,
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
