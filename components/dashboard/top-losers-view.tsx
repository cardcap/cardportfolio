"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { CardImage } from "@/components/ui/card-image";
import { formatCurrency } from "@/lib/format";
import {
  getCard,
  topLosersDetailed,
  topLosersSummary,
  type DetailedMover,
  type MoverKind,
} from "@/lib/mock-data";

type Scope = "gesamt" | "karten" | "sealed";
type Range = "24h" | "7d" | "30d" | "1y";
type SortKey = "loss-desc" | "loss-asc" | "name";

const scopes: { id: Scope; label: string }[] = [
  { id: "gesamt", label: "Gesamt" },
  { id: "karten", label: "Karten" },
  { id: "sealed", label: "Sealed" },
];

const ranges: { id: Range; label: string }[] = [
  { id: "24h", label: "24 Std." },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "1y", label: "1 Jahr" },
];

export function TopLosersView() {
  const [scope, setScope] = useState<Scope>("gesamt");
  const [range, setRange] = useState<Range>("7d");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("loss-desc");

  const filtered = useMemo(() => {
    let rows = [...topLosersDetailed];

    if (scope === "karten") rows = rows.filter((r) => r.kind === "Karte");
    if (scope === "sealed") rows = rows.filter((r) => r.kind === "Sealed");

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const card = getCard(r.cardId);
        const name = (r.name ?? card.name).toLowerCase();
        return (
          name.includes(q) ||
          r.setName.toLowerCase().includes(q) ||
          r.kind.toLowerCase().includes(q)
        );
      });
    }

    rows.sort((a, b) => {
      if (sort === "name") {
        const an = a.name ?? getCard(a.cardId).name;
        const bn = b.name ?? getCard(b.cardId).name;
        return an.localeCompare(bn, "de");
      }
      if (sort === "loss-asc") {
        // geringster Verlust zuerst (z. B. -3 % vor -11 %)
        return b.changePct - a.changePct;
      }
      // loss-desc: höchster Verlust zuerst (am negativsten)
      return a.changePct - b.changePct;
    });

    return rows.slice(0, 10);
  }, [scope, query, sort]);

  const metrics = useMemo(() => {
    if (filtered.length === 0) {
      return { biggest: 0, totalLoss: 0, count: 0 };
    }
    const biggest = Math.min(...filtered.map((r) => r.changePct));
    const totalLoss = filtered.reduce((s, r) => s + r.changeAbs, 0);
    return { biggest, totalLoss, count: filtered.length };
  }, [filtered]);

  const periodLabel =
    range === "24h"
      ? "24 Stunden"
      : range === "7d"
        ? "7 Tagen"
        : range === "30d"
          ? "30 Tagen"
          : "1 Jahr";

  return (
    <div className="pb-4">
      {/* Top bar: breadcrumb + filters */}
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-[var(--muted)]">
            <Link href="/dashboard" className="hover:text-[var(--foreground)]">
              Dashboard
            </Link>
            <span className="mx-1.5 opacity-50">/</span>
            <Link href="/portfolio" className="hover:text-[var(--foreground)]">
              Portfolio
            </Link>
            <span className="mx-1.5 opacity-50">/</span>
            <span className="text-[var(--foreground)]">Top Verlierer</span>
            <span className="mx-1.5 opacity-50">·</span>
            <Link
              href="/portfolio/top-performer"
              className="hover:text-[var(--foreground)]"
            >
              Top Performer
            </Link>
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            Top Verlierer
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Die stärksten Wertverluste deiner Sammlung
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            options={scopes}
            value={scope}
            onChange={setScope}
          />
          <Segmented
            options={ranges}
            value={range}
            onChange={setRange}
          />
          <ThemeToggleButton className="!h-9 !w-9" />
          <Link
            href="/wunschliste"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            aria-label="Wunschliste"
            title="Wunschliste"
          >
            <BellIcon />
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
        >
          <span aria-hidden>←</span>
          Zurück zum Dashboard
        </Link>

        <div className="flex flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row sm:justify-end">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sammlung durchsuchen"
              className="h-9 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            />
          </label>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="loss-desc">Verlust: höchster zuerst</option>
            <option value="loss-asc">Verlust: niedrigster zuerst</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Metric cards */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <MetricTile
          icon="drop"
          label="Größter Rückgang"
          value={`${metrics.biggest.toLocaleString("de-DE", {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
          })} %`}
          negative
        />
        <MetricTile
          icon="card"
          label="Wertverlust gesamt"
          value={formatCurrency(metrics.totalLoss)}
          negative
        />
        <MetricTile
          icon="box"
          label="Betroffene Sammlerstücke"
          value={String(metrics.count)}
        />
      </div>

      {/* Table panel */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
          <h2 className="text-sm font-medium">Top 10 Verlierer</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Vergleich zum Marktwert vor {periodLabel}
          </p>
        </div>

        {/* Desktop header */}
        <div className="hidden border-b border-[var(--border)] px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--muted)] xl:grid xl:grid-cols-[2.5rem_minmax(12rem,1.4fr)_4.5rem_minmax(7rem,1fr)_6.5rem_6.5rem_8rem_5rem_1.5rem] xl:gap-3 xl:px-5">
          <span>#</span>
          <span>Sammlerstück</span>
          <span>Typ</span>
          <span>Set / Produkt</span>
          <span className="text-right">Wert vor 7 Tagen</span>
          <span className="text-right">Aktueller Wert</span>
          <span className="text-right">Veränderung</span>
          <span className="text-right">7-Tage-Trend</span>
          <span />
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-[var(--muted)]">
              Keine Treffer für diese Filter.
            </li>
          )}
          {filtered.map((row, index) => (
            <LoserRow key={row.id} row={row} rank={index + 1} />
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>⏱</span>
              Preise zuletzt aktualisiert: {topLosersSummary.pricesUpdatedLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>🏷</span>
              Durchschnittliche Marktpreise
            </span>
          </div>
          <span className="tabular-nums">
            1–{filtered.length} von {filtered.length}
          </span>
        </div>
      </div>
    </div>
  );
}

function LoserRow({ row, rank }: { row: DetailedMover; rank: number }) {
  const card = getCard(row.cardId);
  const name = row.name ?? card.name;
  const href = row.kind === "Sealed" ? "/assets/sealed" : "/assets/karten";

  return (
    <li>
      <Link
        href={href}
        className="block px-4 py-3 transition-colors hover:bg-[var(--surface-elevated)]/60 sm:px-5"
      >
        {/* Mobile / tablet */}
        <div className="flex gap-3 xl:hidden">
          <span
            className={`tabular-nums w-5 shrink-0 pt-1 text-sm font-medium ${
              rank === 1 ? "text-[var(--negative)]" : "text-[var(--muted)]"
            }`}
          >
            {rank}
          </span>
          <CardImage src={card.imageUrl} alt={name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="truncate text-xs text-[var(--muted)]">{row.setName}</p>
              </div>
              <KindBadge kind={row.kind} />
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
              <div className="text-xs text-[var(--muted)]">
                <span className="tabular-nums">{formatCurrency(row.valueBefore)}</span>
                <span className="mx-1">→</span>
                <span className="tabular-nums text-[var(--foreground)]">
                  {formatCurrency(row.currentValue)}
                </span>
              </div>
              <div className="text-right">
                <p className="tabular-nums text-sm font-medium text-[var(--negative)]">
                  {formatCurrency(row.changeAbs)} ·{" "}
                  {row.changePct.toLocaleString("de-DE", {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })}{" "}
                  %
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <TrendSparkline values={row.trend} />
              <Chevron />
            </div>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden items-center gap-3 xl:grid xl:grid-cols-[2.5rem_minmax(12rem,1.4fr)_4.5rem_minmax(7rem,1fr)_6.5rem_6.5rem_8rem_5rem_1.5rem]">
          <span
            className={`tabular-nums text-sm font-medium ${
              rank === 1 ? "text-[var(--negative)]" : "text-[var(--muted)]"
            }`}
          >
            {rank}
          </span>
          <div className="flex min-w-0 items-center gap-3">
            <CardImage src={card.imageUrl} alt={name} size="sm" />
            <p className="truncate text-sm font-medium">{name}</p>
          </div>
          <KindBadge kind={row.kind} />
          <p className="truncate text-sm text-[var(--muted)]">{row.setName}</p>
          <p className="tabular-nums text-right text-sm text-[var(--muted)]">
            {formatCurrency(row.valueBefore)}
          </p>
          <p className="tabular-nums text-right text-sm">
            {formatCurrency(row.currentValue)}
          </p>
          <p className="tabular-nums text-right text-sm font-medium text-[var(--negative)]">
            {formatCurrency(row.changeAbs)}
            <span className="mx-1 text-[var(--muted)]">·</span>
            {row.changePct.toLocaleString("de-DE", {
              maximumFractionDigits: 1,
              minimumFractionDigits: 1,
            })}{" "}
            %
          </p>
          <div className="flex justify-end">
            <TrendSparkline values={row.trend} />
          </div>
          <div className="flex justify-end text-[var(--muted)]">
            <Chevron />
          </div>
        </div>
      </Link>
    </li>
  );
}

function KindBadge({ kind }: { kind: MoverKind }) {
  const sealed = kind === "Sealed";
  return (
    <span
      className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-medium ${
        sealed
          ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20"
          : "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20"
      }`}
    >
      {kind}
    </span>
  );
}

function MetricTile({
  icon,
  label,
  value,
  negative,
}: {
  icon: "drop" | "card" | "box";
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          negative
            ? "bg-[var(--negative-soft)] text-[var(--negative)]"
            : "bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]"
        }`}
      >
        {icon === "drop" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M4 10l8 8 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 6h4v4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {icon === "card" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <rect x="5" y="4" width="10" height="14" rx="1.5" />
            <path d="M9 3.5h7.5A1.5 1.5 0 0 1 18 5v12" />
          </svg>
        )}
        {icon === "box" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
            <path d="M12 12 4 7M12 12l8-5M12 12v10" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
          <span
            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px]"
            aria-hidden
          >
            i
          </span>
        </p>
        <p
          className={`tabular-nums mt-0.5 text-xl font-semibold tracking-tight ${
            negative ? "text-[var(--negative)]" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function TrendSparkline({ values }: { values: number[] }) {
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="opacity-90">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--negative)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.id
              ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
