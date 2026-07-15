import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { PageHeader } from "@/components/layout/page-header";
import { CardImage } from "@/components/ui/card-image";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { Price, formatMarketPrice } from "@/components/ui/price";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  biggestLosers,
  biggestWinners,
  getCard,
  investmentStats,
  monthlyPurchases,
  portfolioDistribution,
  portfolioHistory,
  portfolioMetrics,
  recentPurchases,
  valuableCards,
} from "@/lib/mock-data";

export default function PortfolioPage() {
  return (
    <>
      <PageHeader title="Portfolio" />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Gesamtwert"
          value={formatMarketPrice(portfolioMetrics.totalValue)}
          hint={`+${portfolioMetrics.weeklyChange} % (7 Tage)`}
          positive
        />
        <MetricCard
          label="Investiert"
          value={formatCurrency(portfolioMetrics.invested)}
          hint="−0,0 % (7 Tage)"
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
          hint="+21,0 % (Gesamt)"
          positive
        />
        <MetricCard
          label="Ø Kaufpreis pro Karte"
          value={formatCurrency(portfolioMetrics.avgPurchasePrice)}
        />
        <MetricCard
          label="Beste Karte"
          value={formatMarketPrice(portfolioMetrics.bestCard.value)}
          hint={portfolioMetrics.bestCard.name}
          accent
        />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <AreaChart
          data={portfolioHistory}
          title="Portfolio-Entwicklung"
          currentLabel="19. Juni 2024"
        />

        <Panel title="Wertvollste Karten" action="Alle anzeigen →">
          <div className="space-y-3">
            {valuableCards.map((item, index) => {
              const card = getCard(item.cardId);
              return (
                <div key={item.cardId} className="flex items-center gap-3">
                  <span className="tabular-nums w-4 text-xs text-[var(--muted)]">
                    {index + 1}
                  </span>
                  <CardImage src={card.imageUrl} alt={card.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <p className="text-xs text-[var(--muted)]">{card.setCode}</p>
                  </div>
                  <Price value={item.value} className="text-sm font-medium" />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Größte Gewinner (€)" action="Alle anzeigen →">
          <div className="space-y-3">
            {biggestWinners.map((item, i) => {
              const card = getCard(item.cardId);
              return (
                <div key={item.cardId} className="flex justify-between text-sm">
                  <span>
                    {i + 1}. {card.name}
                  </span>
                  <span className="text-[var(--positive)]">
                    +<Price value={item.change} />
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Größte Verlierer (€)" action="Alle anzeigen →">
          <div className="space-y-3">
            {biggestLosers.map((item, i) => {
              const card = getCard(item.cardId);
              return (
                <div key={item.cardId} className="flex justify-between text-sm">
                  <span>
                    {i + 1}. {card.name}
                  </span>
                  <span className="text-[var(--negative)]">
                    <Price value={item.change} />
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Portfolio-Verteilung" action="Alle anzeigen →">
          <DonutChart segments={portfolioDistribution} size={120} />
        </Panel>

        <Panel title="Investment-Statistik" action="Alle anzeigen →">
          <div className="space-y-3">
            {investmentStats.map((stat) => (
              <div
                key={stat.label}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="text-[var(--muted)]">{stat.label}</span>
                <span className="font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Käufe nach Monat">
          <BarChart data={monthlyPurchases} maxValue={3000} />
        </Panel>

        <Panel title="Letzte Käufe" action="Alle anzeigen →">
          <div className="space-y-3">
            {recentPurchases.map((purchase) => {
              const card = getCard(purchase.cardId);
              return (
                <div
                  key={purchase.cardId}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">{card.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {purchase.date}
                    </p>
                  </div>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(purchase.price)}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}