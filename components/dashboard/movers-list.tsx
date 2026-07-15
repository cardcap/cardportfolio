import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CardImage } from "@/components/ui/card-image";
import { formatCurrency } from "@/lib/format";
import { getCard, type RankedMover } from "@/lib/mock-data";

type MoversListProps = {
  title: string;
  subtitle: string;
  items: RankedMover[];
  mode: "winner" | "loser";
};

export function MoversList({ title, subtitle, items, mode }: MoversListProps) {
  const otherHref =
    mode === "winner" ? "/portfolio/top-verlierer" : "/portfolio/top-performer";
  const otherLabel =
    mode === "winner" ? "Top Verlierer ansehen →" : "Top Performer ansehen →";

  return (
    <>
      <div className="mb-1 text-xs text-[var(--muted)]">
        <Link href="/dashboard" className="hover:text-[var(--foreground)]">
          Dashboard
        </Link>
        <span className="mx-1.5 opacity-50">/</span>
        <Link href="/portfolio" className="hover:text-[var(--foreground)]">
          Portfolio
        </Link>
        <span className="mx-1.5 opacity-50">/</span>
        <span className="text-[var(--foreground)]">{title}</span>
      </div>
      <PageHeader title={title} subtitle={subtitle}>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={otherHref}
            className="text-sm font-medium text-[var(--accent)] hover:opacity-80"
          >
            {otherLabel}
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            ← Zurück zum Dashboard
          </Link>
        </div>
      </PageHeader>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-3 border-b border-[var(--border)] px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--muted)] sm:grid-cols-[3rem_1fr_8rem_6rem_5rem]">
          <span>#</span>
          <span>Karte</span>
          <span className="hidden sm:block">Set</span>
          <span className="text-right">Preis</span>
          <span className="text-right">7 Tage</span>
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {items.slice(0, 10).map((item, index) => {
            const card = getCard(item.cardId);
            const changeColor =
              mode === "winner" ? "text-[var(--positive)]" : "text-[var(--negative)]";
            const changePrefix = item.change > 0 ? "+" : "";

            return (
              <li key={item.cardId}>
                <Link
                  href="/assets/karten"
                  className="grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-elevated)]/50 sm:grid-cols-[3rem_1fr_8rem_6rem_5rem]"
                >
                  <span className="tabular-nums text-sm text-[var(--muted)]">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 items-center gap-3">
                    <CardImage src={card.imageUrl} alt={card.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{card.name}</p>
                      <p className="truncate text-xs text-[var(--muted)] sm:hidden">
                        {card.setName}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {card.rarity}
                      </p>
                    </div>
                  </div>
                  <p className="hidden truncate text-sm text-[var(--muted)] sm:block">
                    {card.setName}
                  </p>
                  <p className="tabular-nums text-right text-sm">
                    {formatCurrency(item.price ?? card.price)}
                  </p>
                  <p
                    className={`tabular-nums text-right text-sm font-medium ${changeColor}`}
                  >
                    {changePrefix}
                    {item.change.toLocaleString("de-DE")} %
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link
          href="/portfolio/positionen"
          className="font-medium text-[var(--accent)] hover:opacity-80"
        >
          Alle Positionen →
        </Link>
        <Link
          href="/portfolio"
          className="text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Portfolio-Übersicht →
        </Link>
      </div>
    </>
  );
}
