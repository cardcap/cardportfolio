"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CardImage } from "@/components/ui/card-image";
import { InfoTip } from "@/components/ui/metric-card";
import {
  usePortfolioAssets,
  type LivePosition,
} from "@/hooks/use-portfolio-assets";
import { formatCurrency } from "@/lib/format";

type Scope = "gesamt" | "karten" | "sealed";
type Range = "24h" | "7d" | "30d" | "1y";
type SortKey = "loss-desc" | "loss-asc" | "name";
type MoverKind = "Karte" | "Sealed";

type DetailedMover = {
  cardId: string;
  kind: MoverKind;
  setName: string;
  name: string;
  changePct: number;
  changeAbs: number;
  price: number;
  valueBefore: number;
  currentValue: number;
  language?: string;
  condition?: string;
  trend: number[];
  imageUrl?: string;
  imageFallbacks?: string[];
  href: string;
};

function toMover(p: LivePosition): DetailedMover {
  const changeAbs = Math.round((p.market - p.invested) * 100) / 100;
  return {
    cardId: p.id,
    kind: p.kind,
    setName: p.setName,
    name: p.name,
    changePct: p.returnPct,
    changeAbs,
    price: p.market,
    valueBefore: p.invested,
    currentValue: p.market,
    language: p.language,
    condition: p.condition,
    trend: [p.invested, p.market],
    imageUrl: p.imageUrl,
    imageFallbacks: p.imageFallbacks,
    href: p.href,
  };
}

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
  const live = usePortfolioAssets();
  const [scope, setScope] = useState<Scope>("gesamt");
  const [range, setRange] = useState<Range>("7d");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("loss-desc");

  const filtered = useMemo(() => {
    let rows = live.positions
      .filter((p) => p.returnPct < 0)
      .map(toMover);

    if (scope === "karten") rows = rows.filter((r) => r.kind === "Karte");
    if (scope === "sealed") rows = rows.filter((r) => r.kind === "Sealed");

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.setName.toLowerCase().includes(q) ||
          r.kind.toLowerCase().includes(q),
      );
    }

    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "de");
      if (sort === "loss-asc") return b.changePct - a.changePct;
      return a.changePct - b.changePct;
    });

    return rows.slice(0, 25);
  }, [live.positions, scope, query, sort]);

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

        <div className="flex flex-wrap items-center justify-end gap-2">
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
          infoText="Stärkster prozentualer Wertverlust im gewählten Zeitraum unter den Top-Positionen."
        />
        <MetricTile
          icon="card"
          label="Wertverlust gesamt"
          value={formatCurrency(metrics.totalLoss)}
          negative
          infoText="Summe der absoluten Kursverluste aller angezeigten Top-Verlierer."
        />
        <MetricTile
          icon="box"
          label="Betroffene Sammlerstücke"
          value={String(metrics.count)}
          infoText="Anzahl der Karten und Sealed-Produkte in dieser Auswertung."
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

        {/* Desktop header — price columns get fixed min widths so they never overlap */}
        <div className="hidden border-b border-[var(--border)] px-4 py-2.5 text-[10px] uppercase tracking-wider text-[var(--muted)] xl:grid xl:grid-cols-[2rem_minmax(10rem,1.2fr)_minmax(5.5rem,0.8fr)_auto_2.5rem_2.75rem_minmax(5.25rem,auto)_minmax(9.5rem,auto)_3.75rem_1.25rem] xl:items-center xl:gap-3 xl:px-5">
          <span>#</span>
          <span>Sammlerstück</span>
          <span>Set / Produkt</span>
          <span>Typ</span>
          <span>Spr.</span>
          <span>Zustand</span>
          <span className="text-right">Vor 7 T.</span>
          <span className="text-right">Aktuell · Δ</span>
          <span className="text-right">Trend</span>
          <span />
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-[var(--muted)]">
              Keine Treffer für diese Filter.
            </li>
          )}
          {filtered.map((row, index) => (
            <LoserRow key={row.cardId} row={row} rank={index + 1} />
          ))}
        </ul>

        <div className="flex flex-col gap-2 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>⏱</span>
              Preise aus Assets → Karten &amp; Sealed
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
  const card = {
    imageUrl: row.imageUrl ?? "",
    name: row.name,
  };
  const name = row.name ?? card.name;
  const href = row.kind === "Sealed" ? "/assets/sealed" : "/assets/karten";
  const lang = row.language ?? "DE";
  const condition = row.condition ?? "NM";
  const delta = `${formatCurrency(row.changeAbs)} · ${row.changePct.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} %`;

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
                <p className="truncate text-xs text-[var(--muted)]">
                  {row.setName} · {lang} · {condition}
                </p>
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
              <p className="tabular-nums text-sm font-medium text-[var(--negative)]">
                {delta}
              </p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <TrendSparkline values={row.trend} />
              <Chevron />
            </div>
          </div>
        </div>

        {/* Desktop — prices in separate columns, first line aligned */}
        <div className="hidden items-center gap-3 xl:grid xl:grid-cols-[2rem_minmax(10rem,1.2fr)_minmax(5.5rem,0.8fr)_auto_2.5rem_2.75rem_minmax(5.25rem,auto)_minmax(9.5rem,auto)_3.75rem_1.25rem]">
          <span
            className={`tabular-nums text-sm font-medium ${
              rank === 1 ? "text-[var(--negative)]" : "text-[var(--muted)]"
            }`}
          >
            {rank}
          </span>
          <div className="flex min-w-0 items-center gap-2.5">
            <CardImage src={card.imageUrl} alt={name} size="sm" />
            <p className="truncate text-sm font-medium">{name}</p>
          </div>
          <p className="min-w-0 truncate text-sm text-[var(--muted)]">
            {row.setName}
          </p>
          <KindBadge kind={row.kind} />
          <span className="text-xs font-medium text-[var(--muted)]">{lang}</span>
          <span className="truncate text-xs text-[var(--muted)]">{condition}</span>
          {/* Same row-height block: price on line 1, spacer matches Δ line */}
          <div className="flex min-w-[5.25rem] flex-col items-end justify-center gap-0.5">
            <span className="tabular-nums whitespace-nowrap text-sm leading-5 text-[var(--muted)]">
              {formatCurrency(row.valueBefore)}
            </span>
            <span className="h-4" aria-hidden />
          </div>
          <div className="flex min-w-[9.5rem] flex-col items-end justify-center gap-0.5">
            <span className="tabular-nums whitespace-nowrap text-sm font-medium leading-5">
              {formatCurrency(row.currentValue)}
            </span>
            <span className="tabular-nums h-4 whitespace-nowrap text-[11px] font-medium leading-4 text-[var(--negative)]">
              {delta}
            </span>
          </div>
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
  infoText,
}: {
  icon: "drop" | "card" | "box";
  label: string;
  value: string;
  negative?: boolean;
  infoText?: string;
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
          {infoText && <InfoTip text={infoText} />}
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


function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
