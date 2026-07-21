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
  sparkToValue,
  usePortfolioAssets,
} from "@/hooks/use-portfolio-assets";
import { setDetailPath } from "@/lib/set-path";

type Scope = "gesamt" | "karten" | "sealed";

export function DashboardView() {
  const [scope, setScope] = useState<Scope>("gesamt");
  const { count: wishlistCount } = useWishlist();
  const live = usePortfolioAssets();

  const scoped = useMemo(() => {
    if (scope === "karten") {
      const totalValue = live.cardsValue;
      const invested = live.cardsInvested;
      const profitLoss = Math.round((totalValue - invested) * 100) / 100;
      const returnRate =
        invested > 0
          ? Math.round((profitLoss / invested) * 1000) / 10
          : totalValue > 0
            ? 100
            : 0;
      return {
        totalValue,
        invested,
        profitLoss,
        returnRate,
        weeklyChange: 0,
        weeklyChangeInvested: 0,
        sparkTotal: sparkToValue(totalValue),
        sparkInvested: sparkToValue(invested),
        valueLabel: "Kartenwert",
        valueInfo:
          "Marktwert deiner Karten aus Assets → Karten.",
        investInfo: "Summe der Einkaufspreise (EK) deiner Karten.",
        profitInfo: "Karten-Marktwert minus investiertes Karten-Kapital.",
        returnInfo: "Rendite nur auf den Karten-Anteil.",
        allocation:
          totalValue > 0
            ? [
                {
                  label: "Karten",
                  percent: 100,
                  color: "#f472b6",
                  value: totalValue,
                },
              ]
            : [],
        breakdown: [],
        centerLabel: "Karten",
        recent: live.topPositions.filter((p) => p.kind === "Karte").slice(0, 4),
        losers: live.worstReturn?.kind === "Karte" ? [live.worstReturn] : [],
        showSets: true,
        countCards: live.cardsCount,
        countSealed: live.sealedProducts,
      };
    }
    if (scope === "sealed") {
      const totalValue = live.sealedValue;
      const invested = live.sealedInvested;
      const profitLoss = Math.round((totalValue - invested) * 100) / 100;
      const returnRate =
        invested > 0
          ? Math.round((profitLoss / invested) * 1000) / 10
          : totalValue > 0
            ? 100
            : 0;
      return {
        totalValue,
        invested,
        profitLoss,
        returnRate,
        weeklyChange: 0,
        weeklyChangeInvested: 0,
        sparkTotal: sparkToValue(totalValue),
        sparkInvested: sparkToValue(invested),
        valueLabel: "Sealed-Wert",
        valueInfo: "Marktwert deiner Produkte aus Assets → Sealed.",
        investInfo: "Summe der Einkaufspreise (EK) deiner Sealed-Produkte.",
        profitInfo: "Sealed-Marktwert minus investiertes Sealed-Kapital.",
        returnInfo: "Rendite nur auf den Sealed-Anteil.",
        allocation:
          totalValue > 0
            ? [
                {
                  label: "Sealed",
                  percent: 100,
                  color: "#a78bfa",
                  value: totalValue,
                },
              ]
            : [],
        breakdown: [],
        centerLabel: "Sealed",
        recent: live.topPositions
          .filter((p) => p.kind === "Sealed")
          .slice(0, 4),
        losers: live.worstReturn?.kind === "Sealed" ? [live.worstReturn] : [],
        showSets: false,
        countCards: live.cardsCount,
        countSealed: live.sealedProducts,
      };
    }

    return {
      totalValue: live.totalValue,
      invested: live.invested,
      profitLoss: live.unrealized,
      returnRate: live.returnRate,
      weeklyChange: 0,
      weeklyChangeInvested: 0,
      sparkTotal: sparkToValue(live.totalValue),
      sparkInvested: sparkToValue(live.invested),
      valueLabel: "Gesamtwert",
      valueInfo:
        "Marktwert aller Karten und Sealed-Produkte aus deinen Assets.",
      investInfo:
        "Summe aller Einkaufspreise (EK) deiner Assets → Karten & Sealed.",
      profitInfo:
        "Differenz aus Marktwert und investiertem Kapital (unrealisiert).",
      returnInfo:
        "Prozentuale Performance: (Marktwert − Investiert) ÷ Investiert × 100.",
      allocation: live.allocation,
      breakdown: live.allocation.map((a) => ({
        label: a.label,
        percent: a.percent,
        color: a.color,
        value: a.value,
      })),
      centerLabel: "Gesamt",
      recent: live.topPositions.slice(0, 4),
      losers: live.worstReturn ? [live.worstReturn] : [],
      showSets: true,
      countCards: live.cardsCount,
      countSealed: live.sealedProducts,
    };
  }, [scope, live]);

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
      <div className="mb-3 grid grid-cols-2 items-stretch gap-3 xl:grid-cols-4">
        <MetricCard
          label={scoped.valueLabel}
          value={formatMarketPrice(scoped.totalValue)}
          changeAbs={
            scoped.sparkTotal.length > 1
              ? scoped.totalValue - scoped.sparkTotal[0]
              : Math.round(scoped.totalValue * (scoped.weeklyChange / 100))
          }
          changePct={scoped.weeklyChange}
          positive={scoped.weeklyChange >= 0}
          negative={scoped.weeklyChange < 0}
          info
          infoText={scoped.valueInfo}
          sparkline={scoped.sparkTotal}
          sparkStyle="area"
          periodNote="letzte 7 Tage"
        />
        <MetricCard
          label="Investiert"
          value={formatCurrency(scoped.invested)}
          changeAbs={
            scoped.sparkInvested.length > 1
              ? scoped.invested - scoped.sparkInvested[0]
              : Math.round(
                  scoped.invested * (scoped.weeklyChangeInvested / 100),
                )
          }
          positive={scoped.weeklyChangeInvested >= 0}
          negative={scoped.weeklyChangeInvested < 0}
          info
          infoText={scoped.investInfo}
          periodNote="aus Assets → Karten & Sealed"
        />
        <MetricCard
          label="Gewinn / Verlust"
          value={`${profitPositive ? "+ " : ""}${formatCurrency(scoped.profitLoss)}`}
          changePct={scoped.weeklyChange}
          positive={profitPositive}
          negative={!profitPositive}
          colorValue
          info
          infoText={scoped.profitInfo}
          periodNote="letzte 7 Tage"
        />
        <MetricCard
          label="Rendite"
          value={formatPercent(scoped.returnRate)}
          changePct={scoped.weeklyChange}
          changeAbsCurrency={false}
          positive={returnPositive}
          negative={!returnPositive}
          colorValue
          info
          infoText={scoped.returnInfo}
          periodNote="letzte 7 Tage"
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
          dailyData={live.history}
          title="Wertentwicklung"
          showSeriesLegend
          minHeight={280}
          seriesFocus={scope}
          footerNote="Nur Assets → Karten & Sealed · Preise aus deiner Sammlung"
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
            title="Sets in deiner Sammlung"
            actionHref="/sets"
            actionLabel="Alle Sets anzeigen →"
          >
            <div className="space-y-4">
              {live.setGroups.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">
                  Noch keine Karten in Assets → Karten.
                </p>
              ) : (
                live.setGroups.slice(0, 5).map((item) => {
                  const maxOwned = live.setGroups[0]?.owned || 1;
                  const percent = Math.min(
                    100,
                    Math.round((item.owned / maxOwned) * 100),
                  );
                  return (
                    <Link
                      key={item.setId}
                      href={setDetailPath(item.setId)}
                      className="flex items-center gap-3 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]/60"
                    >
                      <SetLogo src="" alt={item.setName} size="sm" />
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium">
                            {item.setName}
                          </span>
                          <span className="tabular-nums shrink-0 text-[var(--muted)]">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          {item.owned.toLocaleString("de-DE")} Karten in Assets
                        </p>
                        <ProgressBar value={percent} className="mt-2" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Panel>
          )}
        </div>
      </div>

      {/* Bottom rankers — live assets only */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Beste Rendite"
          actionHref="/assets/karten"
          actionLabel="Sammlung →"
        >
          <div className="space-y-1">
            {live.bestReturn &&
            (scope === "gesamt" ||
              (scope === "karten" && live.bestReturn.kind === "Karte") ||
              (scope === "sealed" && live.bestReturn.kind === "Sealed")) ? (
              <Link
                href={live.bestReturn.href}
                className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/60"
              >
                <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                  1
                </span>
                <CardImage
                  src={live.bestReturn.imageUrl ?? ""}
                  fallbacks={live.bestReturn.imageFallbacks}
                  alt={live.bestReturn.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {live.bestReturn.name}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {live.bestReturn.kind} · {live.bestReturn.setName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular-nums text-sm">
                    {formatCurrency(live.bestReturn.market)}
                  </p>
                  <p className="tabular-nums text-xs text-[var(--positive)]">
                    +{live.bestReturn.returnPct.toLocaleString("de-DE")} %
                  </p>
                </div>
              </Link>
            ) : (
              <p className="px-1 py-3 text-xs text-[var(--muted)]">
                Noch keine Assets mit Rendite-Daten.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Stärkster Verlust"
          actionHref="/assets/karten"
          actionLabel="Sammlung →"
        >
          <div className="space-y-1">
            {live.worstReturn &&
            (scope === "gesamt" ||
              (scope === "karten" && live.worstReturn.kind === "Karte") ||
              (scope === "sealed" && live.worstReturn.kind === "Sealed")) ? (
              <Link
                href={live.worstReturn.href}
                className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/60"
              >
                <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                  1
                </span>
                <CardImage
                  src={live.worstReturn.imageUrl ?? ""}
                  fallbacks={live.worstReturn.imageFallbacks}
                  alt={live.worstReturn.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {live.worstReturn.name}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {live.worstReturn.kind} · {live.worstReturn.setName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular-nums text-sm">
                    {formatCurrency(live.worstReturn.market)}
                  </p>
                  <p className="tabular-nums text-xs text-[var(--negative)]">
                    {live.worstReturn.returnPct.toLocaleString("de-DE")} %
                  </p>
                </div>
              </Link>
            ) : (
              <p className="px-1 py-3 text-xs text-[var(--muted)]">
                Noch keine Assets mit Rendite-Daten.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Wertvollste Positionen"
          actionHref="/assets/karten"
          actionLabel="Sammlung →"
        >
          <div className="space-y-1">
            {scoped.recent.map((row, index) => (
              <Link
                key={row.id}
                href={row.href}
                className="flex items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/60"
              >
                <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                  {index + 1}
                </span>
                <CardImage
                  src={row.imageUrl ?? ""}
                  fallbacks={row.imageFallbacks}
                  alt={row.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {row.kind} · {row.setName}
                  </p>
                </div>
                <p className="tabular-nums text-sm">
                  {formatCurrency(row.market)}
                </p>
              </Link>
            ))}
            {scoped.recent.length === 0 && (
              <p className="px-1 py-3 text-xs text-[var(--muted)]">
                Noch keine Assets in Karten oder Sealed.
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
