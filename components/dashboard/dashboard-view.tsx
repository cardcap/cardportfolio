"use client";

import Link from "next/link";
import { useState } from "react";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { CardImage } from "@/components/ui/card-image";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SetLogo } from "@/components/ui/set-logo";
import { formatMarketPrice } from "@/components/ui/price";
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

export function DashboardView() {
  const [scope, setScope] = useState<Scope>("gesamt");

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Deine Sammlung auf einen Blick"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
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
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  scope === id
                    ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]"
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

          <ThemeToggleButton className="!h-9 !w-9" />

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

      {/* Primary metrics */}
      <div className="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Gesamtwert"
          value={formatMarketPrice(portfolioMetrics.totalValue)}
          hint={`+${portfolioMetrics.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
          positive
          info
          sparkline={metricSparklines.totalValue}
        />
        <MetricCard
          label="Investiert"
          value={formatCurrency(portfolioMetrics.invested)}
          hint={`+${portfolioMetrics.weeklyChangeInvested.toLocaleString("de-DE")} % (7 Tage)`}
          positive
          info
          sparkline={metricSparklines.invested}
        />
        <MetricCard
          label="Gewinn / Verlust"
          value={`+ ${formatCurrency(portfolioMetrics.profitLoss)}`}
          hint={`+${portfolioMetrics.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
          positive
          info
        />
        <MetricCard
          label="Rendite"
          value={formatPercent(portfolioMetrics.returnRate)}
          hint={`+${portfolioMetrics.weeklyChange.toLocaleString("de-DE")} % (7 Tage)`}
          positive
          info
        />
      </div>

      {/* Secondary counts */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CountCard
          icon="cards"
          label="Karten"
          value={portfolioMetrics.totalCards.toLocaleString("de-DE")}
          href="/assets/karten"
        />
        <CountCard
          icon="box"
          label="Sealed Produkte"
          value={String(portfolioMetrics.sealedCount)}
          href="/assets/sealed"
        />
        <Link
          href="/wunschliste"
          className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-[var(--accent)]/40 lg:col-span-1"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                Wunschliste
              </p>
              <p className="tabular-nums text-lg font-medium">
                {portfolioMetrics.wishlistCount}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Chart + allocation / sets */}
      <div className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <AreaChart
          dailyData={portfolioHistoryDaily}
          title="Wertentwicklung"
          showSeriesLegend
          footerNote={`Preise zuletzt aktualisiert: ${portfolioMetrics.pricesUpdatedLabel}`}
        />

        <div className="space-y-5">
          <Panel
            title="Portfolio-Aufteilung"
            actionHref="/portfolio"
            actionLabel="Portfolio öffnen →"
          >
            <DonutChart segments={portfolioAllocation} size={132} />
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--border)] pt-3">
              {portfolioAllocationBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label} {item.percent} %
                </div>
              ))}
            </div>
          </Panel>

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
        </div>
      </div>

      {/* Bottom rankers */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Top Performer (7 Tage)"
          actionHref="/portfolio/top-performer"
          actionLabel="Alle anzeigen →"
        >
          <div className="space-y-1">
            {topPerformers.map((item, index) => {
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
          </div>
        </Panel>

        <Panel
          title="Top Verlierer (7 Tage)"
          actionHref="/portfolio/top-verlierer"
          actionLabel="Alle anzeigen →"
        >
          <div className="space-y-1">
            {topLosersDetailed.slice(0, 3).map((item, index) => {
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
            {recentAdditions.map((row) => {
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
          </div>
        </Panel>
      </div>
    </>
  );
}

function CountCard({
  icon,
  label,
  value,
  href,
}: {
  icon: "cards" | "box";
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-[var(--accent)]/40"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]">
          {icon === "cards" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <rect x="5" y="4" width="10" height="14" rx="1.5" />
              <path d="M9 3.5h7.5A1.5 1.5 0 0 1 18 5v12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
              <path d="M12 12 4 7M12 12l8-5M12 12v10" />
            </svg>
          )}
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
            {label}
          </p>
          <p className="tabular-nums text-lg font-medium">{value}</p>
        </div>
      </div>
    </Link>
  );
}
