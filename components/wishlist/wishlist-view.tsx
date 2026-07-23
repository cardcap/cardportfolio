"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CardImage } from "@/components/ui/card-image";
import { SealedProductImage } from "@/components/ui/sealed-product-image";
import { useWishlist } from "@/components/wishlist-provider";
import { formatCurrency } from "@/lib/format";
import {
  demoChange,
  demoSparkline,
  isPriceTargetReached,
  type WishlistItem,
  type WishlistPriority,
} from "@/lib/wishlist";

type Scope = "all" | "cards" | "sealed";
type SortKey = "priority" | "price-desc" | "price-asc" | "name" | "alarm";
type TargetFilter = "all" | "reached" | "open";
type ViewMode = "grid" | "list";

const PRIORITY_ORDER: Record<WishlistPriority, number> = {
  Hoch: 0,
  Mittel: 1,
  Niedrig: 2,
};

const PRIORITY_DOT: Record<WishlistPriority, string> = {
  Hoch: "bg-red-400",
  Mittel: "bg-amber-400",
  Niedrig: "bg-yellow-300",
};

export function WishlistView() {
  const { items, count, totalValue, removeItem, updateItem, ready } =
    useWishlist();

  const [scope, setScope] = useState<Scope>("all");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("Alle");
  const [series, setSeries] = useState("Alle");
  const [priority, setPriority] = useState("Alle");
  const [targetFilter, setTargetFilter] = useState<TargetFilter>("all");
  const [onlyTarget, setOnlyTarget] = useState(false);
  const [sort, setSort] = useState<SortKey>("priority");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [editingAlarm, setEditingAlarm] = useState<string | null>(null);
  const [alarmDraft, setAlarmDraft] = useState("");

  const alarmsActive = useMemo(
    () =>
      items.filter(
        (i) =>
          i.alarmPrice != null &&
          i.alarmPrice > 0 &&
          !isPriceTargetReached(i),
      ).length,
    [items],
  );
  const targetsReached = useMemo(
    () => items.filter(isPriceTargetReached).length,
    [items],
  );

  const cardCount = items.filter((i) => (i.kind ?? "Karte") === "Karte").length;
  const sealedCount = items.filter((i) => i.kind === "Sealed").length;

  const seriesList = useMemo(() => {
    return [
      ...new Set(
        items.map((i) => i.series || i.setName).filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b, "de"));
  }, [items]);

  const filtered = useMemo(() => {
    let rows = items.map((i) => i);
    if (scope === "cards") rows = rows.filter((i) => (i.kind ?? "Karte") === "Karte");
    if (scope === "sealed") rows = rows.filter((i) => i.kind === "Sealed");

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.setName.toLowerCase().includes(q) ||
          (i.number ?? "").toLowerCase().includes(q),
      );
    }
    if (language !== "Alle") {
      rows = rows.filter((i) => (i.language ?? "DE") === language);
    }
    if (series !== "Alle") {
      rows = rows.filter((i) => (i.series || i.setName) === series);
    }
    if (priority !== "Alle") {
      rows = rows.filter((i) => (i.priority ?? "Mittel") === priority);
    }
    if (onlyTarget || targetFilter === "reached") {
      rows = rows.filter(isPriceTargetReached);
    } else if (targetFilter === "open") {
      rows = rows.filter((i) => !isPriceTargetReached(i));
    }

    rows.sort((a, b) => {
      switch (sort) {
        case "price-desc":
          return (b.price ?? 0) - (a.price ?? 0);
        case "price-asc":
          return (a.price ?? 0) - (b.price ?? 0);
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "alarm":
          return (a.alarmPrice ?? 1e9) - (b.alarmPrice ?? 1e9);
        case "priority":
        default:
          return (
            PRIORITY_ORDER[a.priority ?? "Mittel"] -
            PRIORITY_ORDER[b.priority ?? "Mittel"]
          );
      }
    });
    return rows;
  }, [
    items,
    scope,
    search,
    language,
    series,
    priority,
    onlyTarget,
    targetFilter,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function openAlarmEdit(item: WishlistItem) {
    setEditingAlarm(item.id);
    setAlarmDraft(
      item.alarmPrice != null
        ? item.alarmPrice.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
    );
  }

  function saveAlarm(id: string) {
    const cleaned = alarmDraft.replace(/[€\s]/g, "").replace(",", ".");
    const n = Number.parseFloat(cleaned);
    updateItem(id, {
      alarmPrice: Number.isFinite(n) ? Math.round(n * 100) / 100 : null,
    });
    setEditingAlarm(null);
  }

  if (!ready) {
    return (
      <p className="text-sm text-[var(--muted)]">Wunschliste wird geladen…</p>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wunschliste</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Behalte Karten und Sealed Produkte im Blick
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)]"
            aria-label="Hilfe"
            title="Hilfe"
          >
            ?
          </button>
          <Link
            href="/kartendatenbank"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white hover:brightness-110"
          >
            <span className="text-base leading-none">+</span>
            Aus Datenbank hinzufügen
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          icon="heart"
          label="Artikel auf Wunschliste"
          value={String(count)}
        />
        <Metric
          icon="chart"
          label="Aktueller Marktwert"
          value={formatCurrency(totalValue)}
        />
        <Metric
          icon="bell"
          label="Preisalarm aktiv"
          value={String(alarmsActive)}
        />
        <Metric
          icon="target"
          label="Preisziele erreicht"
          value={String(targetsReached)}
          highlight
        />
      </div>

      {/* Scope + target filter */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `Alle ${count}`],
              ["cards", `Karten ${cardCount}`],
              ["sealed", `Sealed ${sealedCount}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setScope(id);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                scope === id
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] ring-1 ring-[var(--border)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !(onlyTarget || targetFilter === "reached");
            setOnlyTarget(next);
            setTargetFilter(next ? "reached" : "all");
            setPage(1);
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            onlyTarget || targetFilter === "reached"
              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30"
              : "text-[var(--muted)] ring-1 ring-[var(--border)] hover:text-[var(--foreground)]"
          }`}
        >
          ◎ Preisziel erreicht ({targetsReached})
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <label className="relative min-w-0 flex-1 lg:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Wunschliste durchsuchen"
            className="h-9 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </label>

        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)]"
        >
          <option value="Alle">Sprache: Alle</option>
          {["DE", "EN", "JP", "FR"].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={series}
          onChange={(e) => {
            setSeries(e.target.value);
            setPage(1);
          }}
          className="h-9 max-w-[12rem] rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)]"
        >
          <option value="Alle">Serie: Alle</option>
          {seriesList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)]"
        >
          <option value="Alle">Priorität: Alle</option>
          <option value="Hoch">Hoch</option>
          <option value="Mittel">Mittel</option>
          <option value="Niedrig">Niedrig</option>
        </select>

        <select
          value={targetFilter}
          onChange={(e) => {
            setTargetFilter(e.target.value as TargetFilter);
            setOnlyTarget(false);
            setPage(1);
          }}
          className={`h-9 rounded-full border px-3 text-sm ${
            targetFilter !== "all"
              ? "border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
          }`}
        >
          <option value="all">Preisziel: Alle</option>
          <option value="reached">Preisziel erreicht</option>
          <option value="open">Preisziel offen</option>
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            <option value="priority">Priorität: hoch zuerst</option>
            <option value="price-desc">Preis: höchster zuerst</option>
            <option value="price-asc">Preis: niedrigster zuerst</option>
            <option value="alarm">Alarmpreis</option>
            <option value="name">Name A–Z</option>
          </select>

          <div className="flex rounded-full border border-[var(--border)] p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`rounded-full p-1.5 ${
                view === "grid"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted)]"
              }`}
              aria-label="Kacheln"
            >
              <GridIcon />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-full p-1.5 ${
                view === "list"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted)]"
              }`}
              aria-label="Liste"
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <p className="text-sm text-[var(--muted)]">
            Deine Wunschliste ist noch leer.
          </p>
          <Link
            href="/kartendatenbank"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-white"
          >
            Aus Datenbank hinzufügen
          </Link>
        </div>
      ) : pageRows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          Keine Einträge für diese Filter.
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pageRows.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              editingAlarm={editingAlarm === item.id}
              alarmDraft={alarmDraft}
              onAlarmDraft={setAlarmDraft}
              onOpenAlarm={() => openAlarmEdit(item)}
              onSaveAlarm={() => saveAlarm(item.id)}
              onCancelAlarm={() => setEditingAlarm(null)}
              onRemove={() => removeItem(item.id)}
              onPriority={(p) => updateItem(item.id, { priority: p })}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <ul className="divide-y divide-[var(--border)]">
            {pageRows.map((item) => (
              <WishlistListRow
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--muted)]">
          ℹ Preisalarme basieren auf dem aktuellen Marktwert.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span>
            {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, filtered.length)} von{" "}
            {filtered.length} Artikeln
          </span>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] disabled:opacity-40"
          >
            ‹
          </button>
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(
            (p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
                  p === safePage
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)]"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] disabled:opacity-40"
          >
            ›
          </button>
          <label className="ml-1 inline-flex items-center gap-1">
            Pro Seite
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

function WishlistCard({
  item,
  editingAlarm,
  alarmDraft,
  onAlarmDraft,
  onOpenAlarm,
  onSaveAlarm,
  onCancelAlarm,
  onRemove,
  onPriority,
}: {
  item: WishlistItem;
  editingAlarm: boolean;
  alarmDraft: string;
  onAlarmDraft: (v: string) => void;
  onOpenAlarm: () => void;
  onSaveAlarm: () => void;
  onCancelAlarm: () => void;
  onRemove: () => void;
  onPriority: (p: WishlistPriority) => void;
}) {
  const kind = item.kind ?? "Karte";
  const priority = item.priority ?? "Mittel";
  const reached = isPriceTargetReached(item);
  const change = demoChange(item.id);
  const spark = demoSparkline(item.id, item.price);
  const positive = change.pct >= 0;

  const subtitle =
    kind === "Sealed"
      ? item.setName || item.rarity || "Sealed"
      : item.rarity ?? null;
  const metaLine =
    kind === "Sealed"
      ? null
      : [item.setName, item.number && item.number !== item.setName ? item.number : null]
          .filter(Boolean)
          .join(" · ");

  return (
    <article className="card-tile-hover flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex gap-3 p-3.5">
        <div className="relative h-[7.25rem] w-[5.25rem] shrink-0 overflow-visible rounded-xl ring-1 ring-[var(--border)]">
          {kind === "Sealed" ? (
            <SealedProductImage
              src={item.imageUrl}
              fallbacks={item.imageFallbacks}
              alt={item.name}
              badge={item.rarity ?? item.setName}
              language={item.language}
              hue={hashHue(item.id)}
              size="sm"
              className="!h-full !w-full !rounded-xl"
            />
          ) : item.imageUrl ? (
            <CardImage
              src={item.imageUrl}
              fallbacks={item.imageFallbacks}
              alt={item.name}
              hoverGlow
              size="sm"
              className="!h-full !w-full !rounded-xl"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--muted)]">
              <span className="text-[10px]">{item.name.slice(0, 2)}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span
                className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                  kind === "Sealed"
                    ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25"
                    : "bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]"
                }`}
              >
                {kind}
              </span>
              <h3 className="mt-1.5 truncate text-sm font-semibold leading-tight">
                <Link
                  href="/kartendatenbank"
                  className="hover:text-[var(--accent)]"
                  title="In der Datenbank öffnen"
                >
                  {item.name}
                </Link>
              </h3>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {subtitle}
                </p>
              )}
              {metaLine && (
                <p className="truncate text-[11px] text-[var(--muted)]/80">
                  {metaLine}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="rounded-md bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-[var(--border)]">
                {item.language ?? "DE"}
              </span>
              <button
                type="button"
                onClick={onRemove}
                className="text-[var(--accent)] hover:opacity-80"
                aria-label="Von Wunschliste entfernen"
                title="Entfernen"
              >
                ♥
              </button>
              <button
                type="button"
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
                aria-label="Menü"
              >
                ⋮
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            <span>Menge: {item.quantity ?? 1}</span>
            <span className="inline-flex items-center gap-1">
              Priorität:
              <button
                type="button"
                onClick={() => {
                  const order: WishlistPriority[] = [
                    "Hoch",
                    "Mittel",
                    "Niedrig",
                  ];
                  const idx = order.indexOf(priority);
                  onPriority(order[(idx + 1) % order.length]);
                }}
                className="inline-flex items-center gap-1 font-medium text-[var(--foreground)]"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority]}`}
                />
                {priority}
              </button>
            </span>
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] text-[var(--muted)]">
                Aktueller Marktwert
              </p>
              <p className="tabular-nums text-lg font-semibold leading-tight">
                {item.price != null ? formatCurrency(item.price) : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MiniSpark values={spark} positive={positive} />
              <div
                className={`text-right text-[11px] tabular-nums leading-snug ${
                  positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
                }`}
              >
                <p>
                  {positive ? "↗" : "↘"}{" "}
                  {change.abs.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
                <p>
                  {positive ? "+" : ""}
                  {change.pct.toLocaleString("de-DE")} %
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-2 border-t border-[var(--border)] px-3.5 py-3">
        {editingAlarm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Alarm bei ≤</span>
            <input
              type="text"
              value={alarmDraft}
              onChange={(e) => onAlarmDraft(e.target.value)}
              className="h-8 w-24 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm outline-none focus:border-[var(--accent)]"
              autoFocus
            />
            <button
              type="button"
              onClick={onSaveAlarm}
              className="text-xs font-medium text-[var(--accent)]"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={onCancelAlarm}
              className="text-xs text-[var(--muted)]"
            >
              Abbrechen
            </button>
          </div>
        ) : reached ? (
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/25">
              ✓ Preisziel erreicht
            </span>
            <Link
              href={kind === "Sealed" ? "/assets/sealed" : "/assets/karten"}
              className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110"
            >
              ↗ Zur Sammlung hinzufügen
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {item.alarmPrice != null ? (
              <span className="inline-flex w-fit rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200">
                Alarm bei ≤{" "}
                {formatCurrency(item.alarmPrice).replace(/\s/g, " ")}
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">
                Kein Preisalarm gesetzt
              </span>
            )}
            <button
              type="button"
              onClick={onOpenAlarm}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:opacity-80"
            >
              🔔 Preisalarm bearbeiten
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function WishlistListRow({
  item,
  onRemove,
}: {
  item: WishlistItem;
  onRemove: () => void;
}) {
  const reached = isPriceTargetReached(item);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-[var(--surface-elevated)]">
        {item.imageUrl ? (
          <CardImage
            src={item.imageUrl}
            alt={item.name}
            size="sm"
            className="!h-12 !w-9"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="truncate text-xs text-[var(--muted)]">{item.setName}</p>
      </div>
      <span className="tabular-nums text-sm font-medium">
        {item.price != null ? formatCurrency(item.price) : "—"}
      </span>
      {reached && (
        <span className="text-[10px] text-emerald-300">Ziel ✓</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-[var(--muted)] hover:text-[var(--negative)]"
      >
        Entfernen
      </button>
    </li>
  );
}

function MiniSpark({
  values,
  positive,
}: {
  values: number[];
  positive: boolean;
}) {
  const w = 48;
  const h = 20;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.01);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 3) - 1.5;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={positive ? "var(--positive)" : "var(--negative)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Metric({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-4 ${
        highlight
          ? "border-emerald-400/25 bg-emerald-500/10"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          highlight
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-[var(--accent-soft)] text-[var(--accent)]"
        }`}
      >
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

function hashHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
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

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
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
    case "heart":
      return (
        <svg {...p}>
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" />
        </svg>
      );
    case "bell":
      return (
        <svg {...p}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" strokeLinecap="round" />
        </svg>
      );
    case "target":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}
