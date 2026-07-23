"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { getCardImageUrl, type TcgCard } from "@/lib/pokemon-tcg";

type TxType = "Kauf" | "Verkauf";

/** Fixed sources, alphabetically sorted (de locale). */
const SOURCES = [
  "Cardmarket",
  "eBay",
  "Flohmarkt",
  "Kleinanzeigen",
  "Messe",
  "Privatverkauf",
  "Sonstige",
].sort((a, b) => a.localeCompare(b, "de"));

const SOURCE_CUSTOM = "Weitere hinzufügen";

export type PositionOption = {
  id: string;
  label: string;
  kind: "Karte" | "Sealed";
  quantity?: number;
  setName?: string;
  imageUrl?: string;
  /** Collector id e.g. "POR 12/88" or local number for search */
  collectorId?: string;
  /** Extra haystack for search (name, set, number, id) */
  searchText?: string;
};

export type TransactionSavePayload = {
  type: TxType;
  positionId: string;
  positionLabel: string;
  kind: "Karte" | "Sealed";
  date: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  source: string;
  note: string;
  availableQty: number;
  setName?: string;
  imageUrl?: string;
};

type TransactionDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Live asset positions for Verkauf search. */
  positions?: PositionOption[];
  initialType?: TxType;
  initialPositionId?: string;
  onSave?: (
    payload: TransactionSavePayload,
  ) => void | Promise<void>;
};

function cardToOption(c: TcgCard): PositionOption {
  const setName = c.set?.name ?? c.set?.id ?? "";
  const collector =
    c.collectorId?.trim() ||
    (c.setCode && c.number ? `${c.setCode} ${c.number}` : "") ||
    c.number ||
    "";
  const numPart = collector ? ` ${collector}` : "";
  const label = setName
    ? `${c.name}${numPart ? ` ·${numPart}` : ""} (${setName})`
    : `${c.name}${numPart ? ` ·${numPart}` : ""}`;
  return {
    id: c.id,
    label,
    kind: "Karte",
    setName: setName || undefined,
    imageUrl: getCardImageUrl(c) ?? undefined,
    collectorId: collector || undefined,
    searchText: [c.name, collector, setName, c.id, c.number, c.setCode]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };
}

/** Match inventory labels + collector numbers ("POR 12/88", "12/88", name). */
function matchesPositionQuery(p: PositionOption, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return false;

  const hay = (
    p.searchText ||
    [p.label, p.setName, p.collectorId, p.id].filter(Boolean).join(" ")
  ).toLowerCase();

  // Direct substring (name, set, full label)
  if (hay.includes(q)) return true;
  // Compact: "por12/88" vs "por 12/88"
  const compact = (s: string) => s.replace(/[\s/_-]+/g, "");
  if (compact(hay).includes(compact(q))) return true;

  // Number / set-code pattern
  const m = q.match(/^(?:([a-z0-9]{1,6})\s+)?(\d+[a-z]?)(?:\s*\/\s*(\d+))?$/i);
  if (m) {
    const wantNum = m[2].replace(/^0+(\d)/, "$1").toLowerCase();
    const coll = (p.collectorId ?? "").toLowerCase();
    const collNum = coll.match(/(\d+[a-z]?)(?:\s*\/\s*\d+)?$/i)?.[1];
    const collNumNorm = collNum
      ? collNum.replace(/^0+(\d)/, "$1").toLowerCase()
      : "";
    if (collNumNorm === wantNum || coll.includes(wantNum)) {
      if (!m[1]) return true;
      const code = m[1].toUpperCase();
      if (coll.toUpperCase().includes(code) || hay.toUpperCase().includes(code)) {
        return true;
      }
    }
  }
  return false;
}

export function TransactionDrawer({
  open,
  onClose,
  onSave,
  positions: positionsProp,
  initialType = "Kauf",
  initialPositionId = "",
}: TransactionDrawerProps) {
  const [type, setType] = useState<TxType>(initialType);
  const [query, setQuery] = useState("");
  const [selectedPosition, setSelectedPosition] =
    useState<PositionOption | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [source, setSource] = useState<string>("Cardmarket");
  const [customSource, setCustomSource] = useState("");
  const [useCustomSource, setUseCustomSource] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogHits, setCatalogHits] = useState<PositionOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  /** Only true for the duration of one open session — prevents mid-session resets. */
  const sessionActiveRef = useRef(false);
  const searchOpenRef = useRef(false);
  searchOpenRef.current = searchOpen;
  const catalogSearchId = useRef(0);
  /** Snapshot of positions at open time (stable for initial selection). */
  const positionsAtOpenRef = useRef<PositionOption[]>([]);

  const resolvedSource = useCustomSource
    ? customSource.trim() || SOURCE_CUSTOM
    : source;

  const positions = useMemo(
    () => positionsProp ?? [],
    [positionsProp],
  );

  // Reset ONLY when drawer transitions closed → open (never on search focus / type click)
  useEffect(() => {
    if (!open) {
      sessionActiveRef.current = false;
      setSaved(false);
      setSearchOpen(false);
      setQuery("");
      setUseCustomSource(false);
      setCustomSource("");
      setError(null);
      setSaving(false);
      setCatalogHits([]);
      setCatalogLoading(false);
      return;
    }

    if (sessionActiveRef.current) {
      // Already open this session — do not reset type/form
      return;
    }
    sessionActiveRef.current = true;
    positionsAtOpenRef.current = positionsProp ?? [];

    setType(initialType);
    const initial =
      initialPositionId
        ? (positionsProp ?? []).find((p) => p.id === initialPositionId) ?? null
        : null;
    setSelectedPosition(initial);
    setQuery("");
    setQuantity(1);
    setPrice("");
    setFees("0");
    setNote("");
    setCatalogHits([]);
    setSearchOpen(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-edge only
  }, [open]);

  // Escape: close dropdown first, then drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (searchOpenRef.current) {
        setSearchOpen(false);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Kauf: full catalog via /api/cards (supports "POR 12/88", names, …)
  useEffect(() => {
    if (!open || type !== "Kauf") {
      setCatalogHits([]);
      setCatalogLoading(false);
      return;
    }
    const q = query.trim();
    if (q.length < 1) {
      setCatalogHits([]);
      setCatalogLoading(false);
      return;
    }
    const id = ++catalogSearchId.current;
    setCatalogLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          search: q,
          pageSize: "24",
          page: "1",
        });
        const res = await fetch(`/api/cards?${params}`);
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as { data?: TcgCard[] };
        if (id !== catalogSearchId.current) return;
        const hits = (json.data ?? []).map(cardToOption).slice(0, 16);
        setCatalogHits(hits);
      } catch {
        if (id === catalogSearchId.current) setCatalogHits([]);
      } finally {
        if (id === catalogSearchId.current) setCatalogLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [open, type, query]);

  // Verkauf: only assets in inventory (name + collector #)
  const inventoryFiltered = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return positions.filter((p) => matchesPositionQuery(p, q)).slice(0, 16);
  }, [positions, query]);

  const filtered = type === "Kauf" ? catalogHits : inventoryFiltered;

  const selected = selectedPosition;
  const maxQty =
    type === "Verkauf" && selected?.quantity != null
      ? Math.max(1, selected.quantity)
      : 999;

  useEffect(() => {
    if (type === "Verkauf" && quantity > maxQty) {
      setQuantity(maxQty);
    }
  }, [type, maxQty, quantity]);

  const priceNum = parseDe(price);
  const feesNum = parseDe(fees);
  const total =
    (Number.isFinite(priceNum) ? priceNum : 0) * Math.max(1, quantity) +
    (Number.isFinite(feesNum) ? feesNum : 0);

  function handleTypeChange(t: TxType) {
    if (t === type) return;
    setType(t);
    setSelectedPosition(null);
    setQuery("");
    setSearchOpen(false);
    setCatalogHits([]);
    setQuantity(1);
    setError(null);
  }

  if (!open) return null;

  async function handleSave() {
    if (!selected) return;
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Bitte einen gültigen Preis eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave?.({
        type,
        positionId: selected.id,
        positionLabel: selected.label,
        kind: selected.kind,
        date,
        quantity: Math.min(quantity, maxQty),
        pricePerUnit: priceNum,
        fees: Number.isFinite(feesNum) ? feesNum : 0,
        source: resolvedSource,
        note,
        availableQty: selected.quantity ?? quantity,
        setName: selected.setName,
        imageUrl: selected.imageUrl,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
      );
    } finally {
      setSaving(false);
    }
  }

  const emptyHint =
    type === "Kauf"
      ? catalogLoading
        ? "Suche…"
        : query.trim().length === 0
          ? "Tippe z. B. Namen oder POR 12/88"
          : "Keine Treffer im Katalog"
      : positions.length === 0
        ? "Keine Assets in Karten/Sealed."
        : "Keine Treffer im Bestand";

  const searchHint =
    type === "Kauf"
      ? "Name oder Nummer (z. B. POR 12/88) im Katalog suchen."
      : "Name oder Nummer im Bestand suchen.";

  return (
    <>
      <button
        type="button"
        aria-label="Schließen"
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Transaktion erfassen
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Kauf oder Verkauf manuell hinzufügen
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div
            className="flex rounded-full border border-[var(--border)] bg-[var(--background)] p-0.5"
            role="tablist"
            aria-label="Transaktionstyp"
          >
            {(["Kauf", "Verkauf"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={type === t}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTypeChange(t);
                }}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                  type === t
                    ? t === "Kauf"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-emerald-500 text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <Field label="Position">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-2.5 text-[var(--muted)]">
                ⌕
              </span>
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={selected && !query ? selected.label : query}
                onFocus={() => setSearchOpen(true)}
                onClick={() => setSearchOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedPosition(null);
                  setSearchOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => setSearchOpen(false), 180);
                }}
                placeholder={
                  type === "Kauf"
                    ? "z. B. Glurak oder POR 12/88…"
                    : "Im Bestand suchen…"
                }
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-0 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            {searchOpen && query.trim().length > 0 && (
              <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)]">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedPosition(p);
                        setQuery("");
                        setSearchOpen(false);
                        if (type === "Verkauf" && p.quantity) {
                          setQuantity(1);
                        }
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-elevated)]"
                    >
                      <span className="min-w-0 truncate">
                        <span className="block truncate">{p.label}</span>
                        {p.collectorId && (
                          <span className="block text-[10px] text-[var(--muted)]">
                            {p.collectorId}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] text-[var(--muted)]">
                        {p.kind}
                        {p.quantity != null ? ` · ×${p.quantity}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-sm text-[var(--muted)]">
                    {emptyHint}
                  </li>
                )}
              </ul>
            )}
            {searchOpen && query.trim().length === 0 && (
              <p className="mt-1.5 text-xs text-[var(--muted)]">{searchHint}</p>
            )}
            {type === "Verkauf" && selected && (
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                Im Bestand: {selected.quantity ?? "—"} · Verkauf entfernt die
                Karte aus Assets.
              </p>
            )}
            {type === "Kauf" && selected && (
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                Aus Katalog gewählt · wird als Kauf verbucht.
              </p>
            )}
          </Field>

          <Field label="Datum">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Menge">
            <input
              type="number"
              min={1}
              max={type === "Verkauf" ? maxQty : undefined}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(
                      type === "Verkauf" ? maxQty : 9999,
                      Number(e.target.value) || 1,
                    ),
                  ),
                )
              }
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <Field label="Preis / Stück">
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="120,00"
            />
          </Field>

          <Field label="Gebühren">
            <input
              type="text"
              inputMode="decimal"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="0,00"
            />
          </Field>

          <Field label="Bezugsquelle">
            <select
              value={useCustomSource ? SOURCE_CUSTOM : source}
              onChange={(e) => {
                const v = e.target.value;
                if (v === SOURCE_CUSTOM) {
                  setUseCustomSource(true);
                  setCustomSource("");
                } else {
                  setUseCustomSource(false);
                  setSource(v);
                }
              }}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={SOURCE_CUSTOM}>{SOURCE_CUSTOM}</option>
            </select>
            {useCustomSource && (
              <input
                type="text"
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="Eigene Bezugsquelle eingeben…"
                className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                autoFocus
              />
            )}
          </Field>

          <Field label="Notiz (optional)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="z. B. Verkäufer, Stand oder Bestellnummer"
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm">
            <div className="flex justify-between text-[var(--muted)]">
              <span>Gesamt</span>
              <span className="tabular-nums font-medium text-[var(--foreground)]">
                {formatCurrency(total)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Preis × Menge + Gebühren
              {type === "Verkauf"
                ? " · Verkauf entfernt aus dem Bestand"
                : ""}
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-[var(--negative-soft)] px-3 py-2 text-sm text-[var(--negative)]">
              {error}
            </p>
          )}
          {saved && (
            <p className="rounded-lg bg-[var(--positive-soft)] px-3 py-2 text-sm text-[var(--positive)]">
              Transaktion gespeichert
              {type === "Verkauf" ? " · aus Bestand entfernt" : ""}.
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-[var(--border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!selected || !Number.isFinite(priceNum) || saving}
            onClick={() => void handleSave()}
            className="h-10 flex-1 rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110 disabled:opacity-40"
          >
            {saving ? "Speichern…" : "Transaktion speichern"}
          </button>
        </div>
      </aside>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function parseDe(value: string): number {
  const cleaned = value.replace(/[€\s]/g, "").replace(",", ".");
  return Number.parseFloat(cleaned);
}
