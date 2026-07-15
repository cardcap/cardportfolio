"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SetLogo } from "@/components/ui/set-logo";
import { MetricCard } from "@/components/ui/metric-card";
import { formatDateDE } from "@/lib/format";
import { setDetailPath } from "@/lib/set-path";
import { DEFAULT_LANGUAGE, type CardLanguage } from "@/lib/tcgdex-constants";
import type { TcgSet } from "@/lib/pokemon-tcg";

export function SetsView() {
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const language: CardLanguage = DEFAULT_LANGUAGE;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sets?lang=${language}`)
      .then((response) => response.json())
      .then((payload) => {
        setSets(payload.data ?? []);
      })
      .catch(() => setError("Sets konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [language]);

  const filteredSets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sets;
    return sets.filter(
      (set) =>
        set.name.toLowerCase().includes(term) ||
        set.series.toLowerCase().includes(term) ||
        set.id.toLowerCase().includes(term),
    );
  }, [sets, search]);

  const totalCards = sets.reduce((sum, set) => sum + set.total, 0);
  const totalSecretRares = sets.reduce(
    (sum, set) => sum + (set.secretRareCount ?? 0),
    0,
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <PageHeader title="Sets">
        <input
          type="search"
          placeholder="Sets suchen…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)] sm:w-48"
        />
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Sets insgesamt" value={String(sets.length)} />
        <MetricCard
          label="Karten insgesamt"
          value={totalCards.toLocaleString("de-DE")}
        />
        <MetricCard
          label="Secret Rares gesamt"
          value={totalSecretRares.toLocaleString("de-DE")}
        />
        <MetricCard
          label="Neuestes Set"
          value={
            sets[0]?.releaseDate ? formatDateDE(sets[0].releaseDate) : "—"
          }
        />
      </div>

      {error && (
        <p className="mb-4 text-sm text-[var(--negative)]">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Sets werden geladen…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSets.map((set) => (
            <Link
              key={set.id}
              href={setDetailPath(set.id)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
            >
              <SetLogo
                src={set.images.logo}
                fallbacks={
                  set.images.symbol &&
                  set.images.symbol !== set.images.logo
                    ? [set.images.symbol]
                    : []
                }
                alt={set.name}
                size="md"
                className="mb-3"
              />
              <p className="font-medium">{set.series}</p>
              <p className="text-sm text-[var(--muted)]">{set.name}</p>
              {set.releaseDate && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDateDE(set.releaseDate)}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="tabular-nums text-[var(--muted)]">
                  {set.official ?? set.total} + {set.secretRareCount ?? 0}{" "}
                  Secret
                </span>
                <span className="tabular-nums font-medium">
                  {set.total} Karten
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}