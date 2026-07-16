"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SetLogo } from "@/components/ui/set-logo";
import { formatDateDE } from "@/lib/format";
import { setDetailPath } from "@/lib/set-path";
import {
  CARD_LANGUAGES,
  DEFAULT_LANGUAGE,
  type CardLanguage,
} from "@/lib/tcgdex-constants";
import type { TcgSet } from "@/lib/pokemon-tcg";

type ViewMode = "grid" | "list";
type SortKey =
  | "progress-desc"
  | "progress-asc"
  | "name"
  | "name-desc"
  | "date-desc"
  | "date-asc"
  | "cards-desc"
  | "price-asc"
  | "price-desc";
type SetKind = "Hauptset" | "Spezialset" | "Promo";
type CollectStatus =
  | "not_started"
  | "started"
  | "almost"
  | "complete";

type SetWithProgress = TcgSet & {
  owned: number;
  progress: number;
  kind: SetKind;
  year: number;
  collectStatus: CollectStatus;
};

const KIND_STYLES: Record<SetKind, string> = {
  Hauptset: "bg-zinc-800/80 text-zinc-200 ring-1 ring-white/10",
  Spezialset: "bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/25",
  Promo: "bg-pink-500/20 text-pink-200 ring-1 ring-pink-400/25",
};

/** Deterministic demo progress so cards look filled without real collection data */
function demoOwned(setId: string, total: number): number {
  let h = 0;
  for (let i = 0; i < setId.length; i++) h = (h * 31 + setId.charCodeAt(i)) >>> 0;
  const r = (h % 1000) / 1000;
  // ~70% not started, rest varied
  if (r < 0.55) return 0;
  if (r < 0.62) return total; // complete
  if (r < 0.72) return Math.floor(total * (0.85 + (h % 15) / 100)); // almost
  if (r < 0.85) return Math.floor(total * (0.35 + (h % 40) / 100));
  return Math.floor(total * (0.05 + (h % 25) / 100));
}

function classifyKind(set: TcgSet): SetKind {
  const n = `${set.name} ${set.series} ${set.id}`.toLowerCase();
  if (
    n.includes("promo") ||
    n.includes("black star") ||
    set.seriesId === "tcgp" ||
    set.id.includes("p") && set.total < 60
  ) {
    if (n.includes("promo") || set.id.endsWith("p") || n.includes("trainer kit"))
      return "Promo";
  }
  if (
    n.includes("special") ||
    n.includes("trainer gallery") ||
    n.includes("shiny") ||
    n.includes("crown") ||
    n.includes("destin") ||
    n.includes("radiant") ||
    n.includes("paldean fates") ||
    n.includes("prismatic") ||
    n.includes("151") ||
    n.includes("wunder") ||
    set.name.toLowerCase().includes("kollektion")
  ) {
    return "Spezialset";
  }
  // small sets often special
  if (set.total > 0 && set.total < 90) return "Spezialset";
  return "Hauptset";
}

function statusFromProgress(owned: number, total: number): CollectStatus {
  if (owned <= 0) return "not_started";
  const p = total > 0 ? owned / total : 0;
  if (p >= 1) return "complete";
  if (p >= 0.85) return "almost";
  return "started";
}

export function SetsView() {
  const [sets, setSets] = useState<TcgSet[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<CardLanguage>(DEFAULT_LANGUAGE);
  const [view, setView] = useState<ViewMode>("grid");
  // Default: all sets (incl. classic Base Set / Grundset). "Meine Sets" is optional.
  const [mineOnly, setMineOnly] = useState(false);
  const [seriesFilter, setSeriesFilter] = useState("Alle");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [yearFrom, setYearFrom] = useState(1999);
  const [yearTo, setYearTo] = useState(2026);
  const [kinds, setKinds] = useState<Set<SetKind>>(new Set());
  const [statuses, setStatuses] = useState<Set<CollectStatus>>(new Set());
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sets?lang=${language}`)
      .then((response) => response.json())
      .then((payload) => {
        setSets(payload.data ?? []);
      })
      .catch(() => setError("Sets konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, [language]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const enriched: SetWithProgress[] = useMemo(() => {
    return sets.map((set) => {
      const owned = demoOwned(set.id, set.total);
      const progress =
        set.total > 0 ? Math.min(100, Math.round((owned / set.total) * 100)) : 0;
      const year = set.releaseDate
        ? new Date(set.releaseDate).getFullYear()
        : 0;
      return {
        ...set,
        owned,
        progress,
        kind: classifyKind(set),
        year: Number.isFinite(year) ? year : 0,
        collectStatus: statusFromProgress(owned, set.total),
      };
    });
  }, [sets]);

  const seriesList = useMemo(() => {
    const names = [...new Set(enriched.map((s) => s.series).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "de"),
    );
    return names;
  }, [enriched]);

  const yearBounds = useMemo(() => {
    const years = enriched.map((s) => s.year).filter((y) => y > 0);
    return {
      min: years.length ? Math.min(...years) : 1999,
      max: years.length ? Math.max(...years) : 2026,
    };
  }, [enriched]);

  const activeFilterCount =
    (yearFrom > yearBounds.min || yearTo < yearBounds.max ? 1 : 0) +
    (kinds.size > 0 ? 1 : 0) +
    (statuses.size > 0 ? 1 : 0);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = enriched;

    if (mineOnly) rows = rows.filter((s) => s.owned > 0);
    if (seriesFilter !== "Alle")
      rows = rows.filter((s) => s.series === seriesFilter);
    if (term) {
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.series.toLowerCase().includes(term) ||
          s.id.toLowerCase().includes(term),
      );
    }
    if (yearFrom || yearTo) {
      rows = rows.filter((s) => {
        if (!s.year) return true;
        return s.year >= yearFrom && s.year <= yearTo;
      });
    }
    if (kinds.size > 0) rows = rows.filter((s) => kinds.has(s.kind));
    if (statuses.size > 0)
      rows = rows.filter((s) => statuses.has(s.collectStatus));

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "progress-asc":
          return a.progress - b.progress;
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "name-desc":
          return b.name.localeCompare(a.name, "de");
        case "date-asc":
          return (a.releaseDate || "").localeCompare(b.releaseDate || "");
        case "date-desc":
          return (b.releaseDate || "").localeCompare(a.releaseDate || "");
        case "cards-desc":
          return b.total - a.total;
        case "price-asc":
          // Demo: proxy price by total cards (larger sets ~ higher value)
          return a.total - b.total;
        case "price-desc":
          return b.total - a.total;
        case "progress-desc":
        default:
          return b.progress - a.progress || b.owned - a.owned;
      }
    });

    return rows;
  }, [
    enriched,
    mineOnly,
    seriesFilter,
    search,
    yearFrom,
    yearTo,
    kinds,
    statuses,
    sort,
  ]);

  const metrics = useMemo(() => {
    const total = enriched.length;
    const mine = enriched.filter((s) => s.owned > 0);
    const complete = enriched.filter((s) => s.collectStatus === "complete");
    const avg =
      mine.length > 0
        ? Math.round(
            mine.reduce((sum, s) => sum + s.progress, 0) / mine.length,
          )
        : 0;
    return {
      total,
      mine: mine.length,
      complete: complete.length,
      avgProgress: avg,
    };
  }, [enriched]);

  function toggleKind(k: SetKind) {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleStatus(s: CollectStatus) {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function resetExtraFilters() {
    setYearFrom(yearBounds.min);
    setYearTo(yearBounds.max);
    setKinds(new Set());
    setStatuses(new Set());
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sets</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Alle Expansionen von Base Set bis aktuell – Fortschritt im Überblick
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/kartendatenbank"
            className="inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            Datenbank →
          </Link>
          <Link
            href="/assets/karten"
            className="inline-flex h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            Meine Karten →
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)]"
            aria-label="Benachrichtigungen"
          >
            <BellIcon />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile
          icon="stack"
          label="Sets gesamt"
          value={String(metrics.total)}
        />
        <MetricTile
          icon="folder"
          label="Meine Sets"
          value={String(metrics.mine)}
        />
        <MetricTile
          icon="check"
          label="Vollständig"
          value={String(metrics.complete)}
        />
        <MetricTile
          icon="chart"
          label="Ø Fortschritt"
          value={`${metrics.avgProgress} %`}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <label className="relative min-w-0 flex-1 lg:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Set, Kürzel oder Nummer suchen"
            className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </label>

        <button
          type="button"
          onClick={() => setMineOnly((v) => !v)}
          title={
            mineOnly
              ? "Nur Sets mit Karten in der Sammlung"
              : "Alle Sets anzeigen (Standard)"
          }
          className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors ${
            mineOnly
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {mineOnly && <span aria-hidden>✓</span>}
          {mineOnly ? "Meine Sets" : "Alle Sets"}
        </button>

        <select
          value={seriesFilter}
          onChange={(e) => setSeriesFilter(e.target.value)}
          className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
        >
          <option value="Alle">Alle Serien</option>
          {seriesList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as CardLanguage)}
          className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
        >
          {CARD_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              Sprache: {l.label}
            </option>
          ))}
        </select>

        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium ${
              activeFilterCount > 0 || filterOpen
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            <FilterIcon />
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>

          {filterOpen && (
            <div className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-xl">
              <p className="text-sm font-medium">Weitere Filter</p>

              <p className="mt-3 text-[11px] uppercase tracking-wider text-[var(--muted)]">
                Erscheinungsjahr
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <select
                  value={yearFrom}
                  onChange={(e) => setYearFrom(Number(e.target.value))}
                  className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                >
                  {yearOptions(yearBounds.min, yearBounds.max).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className="text-[var(--muted)]">–</span>
                <select
                  value={yearTo}
                  onChange={(e) => setYearTo(Number(e.target.value))}
                  className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                >
                  {yearOptions(yearBounds.min, yearBounds.max).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mt-3 text-[11px] uppercase tracking-wider text-[var(--muted)]">
                Settyp
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(["Hauptset", "Spezialset", "Promo"] as SetKind[]).map((k) => (
                  <Chip
                    key={k}
                    active={kinds.has(k)}
                    onClick={() => toggleKind(k)}
                    label={k}
                  />
                ))}
              </div>

              <p className="mt-3 text-[11px] uppercase tracking-wider text-[var(--muted)]">
                Sammelstatus
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(
                  [
                    ["not_started", "Nicht gestartet"],
                    ["started", "Begonnen"],
                    ["almost", "Fast vollständig"],
                    ["complete", "Vollständig"],
                  ] as const
                ).map(([id, label]) => (
                  <Chip
                    key={id}
                    active={statuses.has(id)}
                    onClick={() => toggleStatus(id)}
                    label={label}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={resetExtraFilters}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Zurücksetzen
                </button>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  Filter anwenden
                </button>
              </div>
            </div>
          )}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
        >
          <option value="progress-desc">Fortschritt: höchste zuerst</option>
          <option value="progress-asc">Fortschritt: niedrigste zuerst</option>
          <option value="date-desc">Neueste zuerst</option>
          <option value="date-asc">Älteste zuerst</option>
          <option value="name">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="price-asc">Preis: niedrigster zuerst</option>
          <option value="price-desc">Preis: höchster zuerst</option>
          <option value="cards-desc">Kartenanzahl</option>
        </select>

        <div className="flex h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`inline-flex h-full items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ${
              view === "grid"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Kachelansicht"
            aria-pressed={view === "grid"}
          >
            <GridIcon />
            Kacheln
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex h-full items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ${
              view === "list"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Listenansicht"
            aria-pressed={view === "list"}
          >
            <ListIcon />
            Liste
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-[var(--negative)]">{error}</p>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mb-3 text-xs text-[var(--muted)]">
          {filtered.length === enriched.length
            ? `${filtered.length} Sets`
            : `${filtered.length} von ${enriched.length} Sets`}
          {mineOnly ? " · Filter: Meine Sets" : ""}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Sets werden geladen…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          Keine Sets für diese Filter.
          {mineOnly && (
            <button
              type="button"
              onClick={() => setMineOnly(false)}
              className="mt-2 block w-full text-[var(--accent)]"
            >
              Alle Sets anzeigen
            </button>
          )}
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {filtered.map((set) => (
            <SetCard key={set.id} set={set} language={language} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((set) => (
              <SetListRow key={set.id} set={set} language={language} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SetCard({
  set,
  language,
}: {
  set: SetWithProgress;
  language: CardLanguage;
}) {
  const fallbacks = buildFallbacks(set, language);
  const complete = set.collectStatus === "complete";

  return (
    <Link
      href={setDetailPath(set.id)}
      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--accent)]/50 hover:shadow-md"
    >
      {/* Compact logo strip — more space for text */}
      <div className="relative flex h-14 items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black sm:h-16">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(244,114,182,0.25), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.2), transparent 50%)",
          }}
        />
        <SetLogo
          src={set.images.logo}
          fallbacks={fallbacks}
          alt={set.name}
          size="sm"
          className="relative z-[1] !h-10 !w-auto max-w-[70%] !rounded-none bg-transparent object-contain"
        />
        <div className="absolute left-1.5 top-1.5 z-[2] flex flex-wrap gap-1">
          <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200 backdrop-blur-sm">
            {language.toUpperCase()}
          </span>
        </div>
        {complete && (
          <span className="absolute right-1.5 top-1.5 z-[2] rounded-full bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
            ✓
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-3.5">
        <p className="truncate text-xs text-[var(--muted)]">{set.series}</p>
        <h2 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight group-hover:text-[var(--accent)]">
          {set.name}
        </h2>
        <p className="text-xs text-[var(--muted)]">
          <span
            className={`mr-1.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_STYLES[set.kind]}`}
          >
            {set.kind}
          </span>
        </p>
        <p className="text-sm text-[var(--muted)]">
          {set.releaseDate ? formatDateDE(set.releaseDate) : "—"}
        </p>
        <p className="text-sm font-medium tabular-nums">
          {set.total.toLocaleString("de-DE")} Karten
        </p>

        <div className="mt-auto pt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="tabular-nums text-[var(--muted)]">
              {set.owned} / {set.total}
            </span>
            <span className="tabular-nums font-semibold">{set.progress} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${set.progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function SetListRow({
  set,
  language,
}: {
  set: SetWithProgress;
  language: CardLanguage;
}) {
  const fallbacks = buildFallbacks(set, language);
  return (
    <li>
      <Link
        href={setDetailPath(set.id)}
        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-[var(--surface-elevated)]/50"
      >
        <SetLogo
          src={set.images.logo}
          fallbacks={fallbacks}
          alt={set.name}
          size="sm"
          className="!h-12 !w-20"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{set.name}</p>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${KIND_STYLES[set.kind]}`}
            >
              {set.kind}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {set.series}
            {set.releaseDate ? ` · ${formatDateDE(set.releaseDate)}` : ""}
          </p>
        </div>
        <div className="hidden w-40 sm:block">
          <div className="mb-1 flex justify-between text-[10px] text-[var(--muted)]">
            <span>
              {set.owned}/{set.total}
            </span>
            <span>{set.progress} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${set.progress}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-medium text-[var(--accent)]">→</span>
      </Link>
    </li>
  );
}

function buildFallbacks(set: TcgSet, language: CardLanguage): string[] {
  const serie = set.seriesId ?? "";
  const list = [
    ...(set.images.fallbacks ?? []),
    // Prefer EN/DE logos before symbol (classic sets often only have EN)
    `https://assets.tcgdex.net/en/${serie}/${set.id}/logo.webp`,
    `https://assets.tcgdex.net/en/${serie}/${set.id}/logo.png`,
    `https://assets.tcgdex.net/${language}/${serie}/${set.id}/logo.webp`,
    `https://assets.tcgdex.net/de/${serie}/${set.id}/logo.webp`,
    `https://images.pokemontcg.io/${set.id}/logo.png`,
    set.images.symbol,
  ].filter(Boolean);
  return [...new Set(list)].filter((u) => u !== set.images.logo);
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        <MIcon type={icon} />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
        </p>
        <p className="tabular-nums text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--accent)] text-white"
          : "bg-[var(--background)] text-[var(--muted)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

function yearOptions(min: number, max: number) {
  const out: number[] = [];
  for (let y = min; y <= max; y++) out.push(y);
  return out;
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
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

function MIcon({ type }: { type: string }) {
  const p = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
  } as const;
  switch (type) {
    case "stack":
      return (
        <svg {...p}>
          <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z" />
          <path d="M3.5 12.5 12 17l8.5-4.5" />
        </svg>
      );
    case "folder":
      return (
        <svg {...p}>
          <path d="M3 7h6l2 2h10v10H3z" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M8.5 12.5 11 15l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
