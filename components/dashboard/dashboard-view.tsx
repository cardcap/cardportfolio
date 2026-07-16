"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { PageHeader } from "@/components/layout/page-header";
import { CardImage } from "@/components/ui/card-image";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SetLogo } from "@/components/ui/set-logo";
import { formatMarketPrice } from "@/components/ui/price";
import { useWishlist } from "@/components/wishlist-provider";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  getCard,
  metricSparklines,
  portfolioAllocation,
  portfolioAllocationBreakdown,
  portfolioHistoryDaily,
  portfolioMetrics,
  recentAdditions,
  setProgress,
  sets,
  topLosersDetailed,
  topPerformers,
} from "@/lib/mock-data";
import { setDetailPath } from "@/lib/set-path";

type Scope = "gesamt" | "karten" | "sealed";

function scaleSpark(values: number[], targetEnd: number): number[] {
  if (!values.length) return values;
  const last = values[values.length - 1] || 1;
  const factor = targetEnd / last;
  return values.map((v) => Math.round(v * factor));
}

export function DashboardView() {
  const [scope, setScope] = useState<Scope>("gesamt");
  const { count: wishlistCount } = useWishlist();
  const m = portfolioMetrics;

  const scoped = useMemo(() => {
    if (scope === "karten") {
      const share = m.cardsValue / m.totalValue;
      const invested = Math.round(m.invested * share);
      const profit = m.cardsValue - invested;
      const returnRate = invested > 0 ? (profit / invested) * 100 : 0;
      const weekly = m.weeklyChange + 0.4;
      return {
        totalValue: m.cardsValue,
        invested,
        profitLoss: profit,
        returnRate,
        weeklyChange: weekly,
        weeklyChangeInvested: m.weeklyChangeInvested + 0.2,
        sparkTotal: scaleSpark(metricSparklines.totalValue, m.cardsValue),
        sparkInvested: scaleSpark(metricSparklines.invested, invested),
        valueLabel: "Kartenwert",
        valueInfo: "Aktueller Marktwert nur deiner Einzelkarten.",
        investInfo: "Summe der Einkaufspreise (EK) deiner Karten-Positionen.",
        profitInfo: "Karten-Marktwert minus investiertes Karten-Kapital.",
        returnInfo: "Rendite nur auf den Karten-Anteil deines Portfolios.",
        allocation: [
          {
            label: "Karten",
            percent: 100,
            color: "#f472b6",
            value: m.cardsValue,
          },
        ],
        breakdown: portfolioAllocationBreakdown.filter(
          (b) => b.label === "Einzelkarten" || b.label.toLowerCase().includes("karte"),
        ),
        centerLabel: "Karten",
        recent: recentAdditions.filter((r) => r.kind !== "Sealed"),
        losers: topLosersDetailed.filter((r) => r.kind !== "Sealed"),
        showSets: true,
        countCards: m.totalCards,
        countSealed: m.sealedCount,
      };
    }
    if (scope === "sealed") {
      const share = m.sealedValue / m.totalValue;
      const invested = Math.round(m.invested * share);
      const profit = m.sealedValue - invested;
      const returnRate = invested > 0 ? (profit / invested) * 100 : 0;
      const weekly = m.weeklyChange - 0.6;
      return {
        totalValue: m.sealedValue,
        invested,
        profitLoss: profit,
        returnRate,
        weeklyChange: weekly,
        weeklyChangeInvested: m.weeklyChangeInvested - 0.1,
        sparkTotal: scaleSpark(metricSparklines.totalValue, m.sealedValue),
        sparkInvested: scaleSpark(metricSparklines.invested, invested),
        valueLabel: "Sealed-Wert",
        valueInfo: "Aktueller Marktwert nur deiner Sealed-Produkte.",
        investInfo: "Summe der Einkaufspreise (EK) deiner Sealed-Produkte.",
        profitInfo: "Sealed-Marktwert minus investiertes Sealed-Kapital.",
        returnInfo: "Rendite nur auf den Sealed-Anteil deines Portfolios.",
        allocation: [
          {
            label: "Sealed",
            percent: 100,
            color: "#a78bfa",
            value: m.sealedValue,
          },
        ],
        breakdown: portfolioAllocationBreakdown.filter(
          (b) =>
            b.label !== "Einzelkarten" &&
            !b.label.toLowerCase().includes("karte"),
        ),
        centerLabel: "Sealed",
        recent: recentAdditions.filter((r) => r.kind === "Sealed"),
        losers: topLosersDetailed.filter((r) => r.kind === "Sealed"),
        showSets: false,
        countCards: m.totalCards,
        countSealed: m.sealedCount,
      };
    }

    return {
      totalValue: m.totalValue,
      invested: m.invested,
      profitLoss: m.profitLoss,
      returnRate: m.returnRate,
      weeklyChange: m.weeklyChange,
      weeklyChangeInvested: m.weeklyChangeInvested,
      sparkTotal: metricSparklines.totalValue,
      sparkInvested: metricSparklines.invested,
      valueLabel: "Gesamtwert",
      valueInfo:
        "Aktueller Marktwert aller Karten und Sealed-Produkte in deiner Sammlung.",
      investInfo:
        "Summe aller Einkaufspreise (EK) deiner Positionen – was du tatsächlich ausgegeben hast.",
      profitInfo:
        "Differenz aus Marktwert und investiertem Kapital (unrealisierter Gewinn in der Demo).",
      returnInfo:
        "Prozentuale Performance: (Marktwert − Investiert) ÷ Investiert × 100.",
      allocation: portfolioAllocation,
      breakdown: portfolioAllocationBreakdown,
      centerLabel: "Gesamt",
      recent: recentAdditions,
      losers: topLosersDetailed,
      showSets: true,
      countCards: m.totalCards,
      countSealed: m.sealedCount,
    };
  }, [scope, m]);

  const profitPositive = scoped.profitLoss >= 0;
  const returnPositive = scoped.returnRate >= 0;

  return (
    <div className="pb-2">
      <PageHeader
        title="Dashboard"
        subtitle="Deine Sammlung auf einen Blick"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5"
            role="group"
            aria-label="Portfolio-Bereich"
          >
            {(
              [
                ["gesamt", "Gesamt"],
                ["karten", "Karten"],
                ["sealed", "Sealed"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setScope(id)}
                aria-pressed={scope === id}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  scope === id
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Link
            href="/kartendatenbank"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white transition-all hover:brightness-110"
          >
            <span className="text-base leading-none">+</span>
            Hinzufügen
          </Link>

          <Link
            href="/wunschliste"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            aria-label="Preisalarme & Wunschliste"
            title="Wunschliste / Preisalarme"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" strokeLinecap="round" />
              <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </PageHeader>

      {/* Primary metrics — react to Gesamt / Karten / Sealed */}
      <div className="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label={scoped.valueLabel}
          value={formatMarketPrice(scoped.totalValue)}
          hint={`+${scoped.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
          positive
          info
          infoText={scoped.valueInfo}
          sparkline={scoped.sparkTotal}
        />
        <MetricCard
          label="Investiert"
          value={formatCurrency(scoped.invested)}
          hint={`+${scoped.weeklyChangeInvested.toLocaleString("de-DE")} % (7 Tage)`}
          positive
          info
          infoText={scoped.investInfo}
          sparkline={scoped.sparkInvested}
        />
        <MetricCard
          label="Gewinn / Verlust"
          value={`${profitPositive ? "+ " : ""}${formatCurrency(scoped.profitLoss)}`}
          hint={`${scoped.weeklyChange >= 0 ? "+" : ""}${scoped.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
          positive={profitPositive}
          negative={!profitPositive}
          info
          infoText={scoped.profitInfo}
        />
        <MetricCard
          label="Rendite"
          value={formatPercent(scoped.returnRate)}
          hint={`${scoped.weeklyChange >= 0 ? "+" : ""}${scoped.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
          positive={returnPositive}
          negative={!returnPositive}
          info
          infoText={scoped.returnInfo}
        />
      </div>

      {/* Secondary counts */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CountCard
          icon="cards"
          label="Karten"
          value={scoped.countCards.toLocaleString("de-DE")}
          href="/assets/karten"
          dimmed={scope === "sealed"}
        />
        <CountCard
          icon="box"
          label="Sealed Produkte"
          value={String(scoped.countSealed)}
          href="/assets/sealed"
          dimmed={scope === "karten"}
        />
        <Link
          href="/wunschliste"
          className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-[var(--accent)]/40 lg:col-span-1"
        >
          <div className="flex items-center gap-3.5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                Wunschliste
              </p>
              <p className="tabular-nums text-xl font-semibold">
                {wishlistCount}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Chart + allocation / sets */}
      <div className="mb-5 grid items-stretch gap-5 xl:grid-cols-[1.55fr_1fr]">
        <AreaChart
          dailyData={portfolioHistoryDaily}
          title="Wertentwicklung"
          showSeriesLegend
          minHeight={280}
          seriesFocus={scope}
          footerNote={`Preise zuletzt aktualisiert: ${portfolioMetrics.pricesUpdatedLabel}`}
        />

        <div className="space-y-5">
          <Panel
            title="Portfolio-Aufteilung"
            actionHref="/portfolio"
            actionLabel="Portfolio öffnen →"
          >
            <div className="flex justify-center py-2">
              <DonutChart
                segments={scoped.allocation}
                size={168}
                ringWidth={26}
                hideLegend
                centerLabel={scoped.centerLabel}
                centerSub={formatCurrency(scoped.totalValue)}
              />
            </div>
            <div className="mt-2 space-y-2 border-t border-[var(--border)] pt-3">
              {scoped.allocation.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </span>
                  <span className="tabular-nums font-medium">
                    {item.percent} %
                    <span className="ml-2 text-[var(--muted)]">
                      {formatCurrency(item.value)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {scoped.breakdown.length > 0 && (
            <div className="mt-4 space-y-2.5 border-t border-[var(--border)] pt-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                Nach Kategorie
              </p>
              {scoped.breakdown.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-[var(--muted)]">
                        {item.label}
                      </span>
                    </span>
                    <span className="tabular-nums shrink-0 font-medium">
                      {item.percent} %
                      {item.value != null && (
                        <span className="ml-1.5 text-[var(--muted)]">
                          {formatCurrency(item.value)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            )}
          </Panel>

          {scoped.showSets && (
          <Panel
            title="Set-Fortschritt"
            actionHref="/sets"
            actionLabel="Alle Sets anzeigen →"
          >
            <div className="space-y-4">
              {setProgress.map((item) => {
                const set = sets.find((s) => s.id === item.setId)!;
                const percent = Math.round((item.owned / item.total) * 100);
                return (
                  <Link
                    key={item.setId}
                    href={setDetailPath(item.setId)}
                    className="flex items-center gap-3 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]/60"
                  >
                    <SetLogo src={set.logoUrl} alt={set.name} size="sm" />
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{set.name}</span>
                        <span className="tabular-nums shrink-0 text-[var(--muted)]">
                          {percent} %
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        {item.owned} / {item.total} Karten
                      </p>
                      <ProgressBar value={percent} className="mt-2" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>
          )}
        </div>
      </div>

      {/* Bottom rankers */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Top Performer (7 Tage)"
          actionHref="/portfolio/top-performer"
          actionLabel="Top 10 anzeigen →"
        >
          <div className="space-y-1">
            {(scope === "sealed" ? [] : topPerformers).map((item, index) => {
              const card = getCard(item.cardId);
              return (
                <Link
                  key={item.cardId}
                  href="/portfolio/top-performer"
                  className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/60"
                >
                  <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                    {index + 1}
                  </span>
                  <CardImage src={card.imageUrl} alt={card.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {card.rarity} · {card.setName}
                    </p>
                  </div>
                  <div className="text-right">
                    {item.price != null && (
                      <p className="tabular-nums text-sm">
                        {formatCurrency(item.price)}
                      </p>
                    )}
                    <p className="tabular-nums text-xs text-[var(--positive)]">
                      +{item.change.toLocaleString("de-DE")} %
                    </p>
                  </div>
                </Link>
              );
            })}
            {scope === "sealed" && (
              <p className="px-1 py-3 text-xs text-[var(--muted)]">
                Top Performer für Sealed erscheinen unter Assets → Sealed.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Top Verlierer (7 Tage)"
          actionHref="/portfolio/top-verlierer"
          actionLabel="Alle anzeigen →"
        >
          <div className="space-y-1">
            {scoped.losers.slice(0, 3).map((item, index) => {
              const card = getCard(item.cardId);
              const name = item.name ?? card.name;
              const dest =
                item.kind === "Sealed" ? "/assets/sealed" : "/portfolio/top-verlierer";
              return (
                <Link
                  key={item.id}
                  href={dest}
                  className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/60"
                >
                  <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                    {index + 1}
                  </span>
                  <CardImage src={card.imageUrl} alt={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {item.kind} · {item.setName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums text-sm">
                      {formatCurrency(item.valueBefore)}
                    </p>
                    <p className="tabular-nums text-xs text-[var(--negative)]">
                      {item.changePct.toLocaleString("de-DE")} %
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Zuletzt hinzugefügt"
          actionHref="/assets/karten"
          actionLabel="Sammlung öffnen →"
        >
          <div className="space-y-1">
            {scoped.recent.map((row) => {
              const card = getCard(row.cardId);
              const dest =
                row.kind === "Sealed" ? "/assets/sealed" : "/assets/karten";
              return (
                <Link
                  key={`${row.cardId}-${row.dateLabel}`}
                  href={dest}
                  className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/60"
                >
                  <CardImage src={card.imageUrl} alt={card.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {card.rarity} · {card.setName}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        row.kind === "Sealed"
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]"
                      }`}
                    >
                      {row.kind}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {row.dateLabel}
                    </span>
                  </div>
                </Link>
              );
            })}
            {scoped.recent.length === 0 && (
              <p className="px-1 py-3 text-xs text-[var(--muted)]">
                Keine Einträge in diesem Bereich.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CountCard({
  icon,
  label,
  value,
  href,
  dimmed,
}: {
  icon: "cards" | "box";
  label: string;
  value: string;
  href: string;
  dimmed?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-[var(--accent)]/40 ${
        dimmed ? "opacity-45" : ""
      }`}
    >
      <div className="flex items-center gap-3.5">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--foreground)] ring-1 ring-[var(--border)]">
          {icon === "cards" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <rect x="5" y="4" width="10" height="14" rx="1.5" />
              <path d="M9 3.5h7.5A1.5 1.5 0 0 1 18 5v12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
              <path d="M12 12 4 7M12 12l8-5M12 12v10" />
            </svg>
          )}
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
            {label}
          </p>
          <p className="tabular-nums text-xl font-semibold">{value}</p>
        </div>
      </div>
    </Link>
  );
}
