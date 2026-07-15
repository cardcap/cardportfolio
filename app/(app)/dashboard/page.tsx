import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { PageHeader } from "@/components/layout/page-header";
import { CardImage } from "@/components/ui/card-image";
import { SetLogo } from "@/components/ui/set-logo";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMarketPrice } from "@/components/ui/price";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  getCard,
  portfolioHistory,
  portfolioMetrics,
  portfolioAllocation,
  setProgress,
  sets,
  topLosers,
  topPerformers,
  collection,
} from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <MetricCard
          label="Gesamtwert"
          value={formatMarketPrice(portfolioMetrics.totalValue)}
          hint={`+${portfolioMetrics.weeklyChange} % (7 Tage)`}
          positive
        />
        <MetricCard
          label="Investiert"
          value={formatCurrency(portfolioMetrics.invested)}
          hint={`+${portfolioMetrics.weeklyChange} % (7 Tage)`}
          positive
        />
        <MetricCard
          label="Gewinn / Verlust"
          value={`+${formatMarketPrice(portfolioMetrics.profitLoss)}`}
          hint={`+${portfolioMetrics.weeklyChange} % (7 Tage)`}
          positive
        />
        <MetricCard
          label="Rendite"
          value={formatPercent(portfolioMetrics.returnRate)}
          hint={`+${portfolioMetrics.weeklyChange} % (7 Tage)`}
          positive
        />
        <MetricCard
          label="Karten gesamt"
          value={portfolioMetrics.totalCards.toLocaleString("de-DE")}
          hint="In deiner Sammlung"
        />
        <MetricCard
          label="Wunschliste"
          value={String(portfolioMetrics.wishlistCount)}
          hint="Karten"
        />
        <MetricCard
          label="Wunschlistenwert"
          value={formatMarketPrice(portfolioMetrics.wishlistValue)}
          hint="Geschätzter Wert"
        />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <AreaChart
          data={portfolioHistory}
          title="Wertentwicklung"
          subtitle="Entwicklung deines Kartenportfolios"
          currentLabel="19. Juni 2024"
        />

        <div className="space-y-5">
          <Panel title="Portfolio-Aufteilung">
            <DonutChart segments={portfolioAllocation} />
          </Panel>

          <Panel title="Set-Fortschritt" action="Alle Sets anzeigen →">
            <div className="space-y-4">
              {setProgress.map((item) => {
                const set = sets.find((s) => s.id === item.setId)!;
                const percent = Math.round((item.owned / item.total) * 100);
                return (
                  <div key={item.setId} className="flex items-center gap-3">
                    <SetLogo src={set.logoUrl} alt={set.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{set.name}</span>
                        <span className="tabular-nums text-[var(--muted)]">
                          {percent} %
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        {item.owned} / {item.total} Karten
                      </p>
                      <ProgressBar value={percent} className="mt-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Top Performer (7 Tage)" action="Alle Gewinner →">
          <div className="space-y-3">
            {topPerformers.map((item, index) => {
              const card = getCard(item.cardId);
              return (
                <div key={item.cardId} className="flex items-center gap-3">
                  <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                    {index + 1}
                  </span>
                  <CardImage src={card.imageUrl} alt={card.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="text-xs text-[var(--muted)]">{card.setName}</p>
                  </div>
                  <span className="tabular-nums text-sm text-[var(--positive)]">
                    +{item.change} %
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Top Verlierer (7 Tage)" action="Alle Verlierer →">
          <div className="space-y-3">
            {topLosers.map((item, index) => {
              const card = getCard(item.cardId);
              return (
                <div key={item.cardId} className="flex items-center gap-3">
                  <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                    {index + 1}
                  </span>
                  <CardImage src={card.imageUrl} alt={card.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="text-xs text-[var(--muted)]">{card.setName}</p>
                  </div>
                  <span className="tabular-nums text-sm text-[var(--negative)]">
                    {item.change} %
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Zuletzt hinzugefügt" action="Zur Sammlung →">
          <div className="space-y-3">
            {collection.slice(0, 5).map((row) => {
              const card = getCard(row.cardId);
              return (
                <div key={row.cardId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {row.addedAgo ?? card.setName}
                    </p>
                  </div>
                  {row.addedAgo?.includes("Tag") && (
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      Neu
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}