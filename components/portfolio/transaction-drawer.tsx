"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { getCard, sealedProducts, type Card } from "@/lib/mock-data";

type TxType = "Kauf" | "Verkauf";

const SOURCES = [
  "Cardmarket",
  "Privatverkauf",
  "Messe München",
  "Messe Stuttgart",
  "Excel-Import",
  "eBay",
  "Sonstige",
] as const;

type PositionOption = {
  id: string;
  label: string;
  kind: "Karte" | "Sealed";
  cardId?: string;
};

type TransactionDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (payload: {
    type: TxType;
    positionId: string;
    positionLabel: string;
    date: string;
    quantity: number;
    pricePerUnit: number;
    fees: number;
    source: string;
    note: string;
  }) => void;
};

export function TransactionDrawer({
  open,
  onClose,
  onSave,
}: TransactionDrawerProps) {
  const [type, setType] = useState<TxType>("Kauf");
  const [query, setQuery] = useState("");
  const [positionId, setPositionId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState("120");
  const [fees, setFees] = useState("2,40");
  const [source, setSource] = useState<string>("Cardmarket");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) {
      setSaved(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const positions = useMemo(() => buildPositionOptions(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return positions.slice(0, 8);
    return positions
      .filter((p) => p.label.toLowerCase().includes(q))
      .slice(0, 12);
  }, [positions, query]);

  const selected = positions.find((p) => p.id === positionId);

  const priceNum = parseDe(price);
  const feesNum = parseDe(fees);
  const total =
    (Number.isFinite(priceNum) ? priceNum : 0) * Math.max(1, quantity) +
    (Number.isFinite(feesNum) ? feesNum : 0);

  if (!open) return null;

  function handleSave() {
    if (!selected) return;
    onSave?.({
      type,
      positionId: selected.id,
      positionLabel: selected.label,
      date,
      quantity,
      pricePerUnit: priceNum,
      fees: feesNum,
      source,
      note,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  }

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
          {/* Kauf / Verkauf */}
          <div className="flex rounded-full border border-[var(--border)] bg-[var(--background)] p-0.5">
            {(["Kauf", "Verkauf"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
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
                type="search"
                value={selected && !query ? selected.label : query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPositionId("");
                }}
                placeholder="Karte oder Sealed Produkt auswählen"
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-0 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            {(query || !positionId) && (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)]">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPositionId(p.id);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-elevated)]"
                    >
                      <span className="truncate">{p.label}</span>
                      <span className="shrink-0 text-[10px] text-[var(--muted)]">
                        {p.kind}
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-sm text-[var(--muted)]">
                    Keine Treffer
                  </li>
                )}
              </ul>
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
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
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
              placeholder="120,00 €"
            />
          </Field>

          <Field label="Gebühren">
            <input
              type="text"
              inputMode="decimal"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="2,40 €"
            />
          </Field>

          <Field label="Bezugsquelle">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Wird automatisch in deiner Transaktionshistorie gespeichert.
            </p>
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
            </p>
          </div>

          {saved && (
            <p className="rounded-lg bg-[var(--positive-soft)] px-3 py-2 text-sm text-[var(--positive)]">
              Transaktion gespeichert.
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
            disabled={!selected || !Number.isFinite(priceNum)}
            onClick={handleSave}
            className="h-10 flex-1 rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110 disabled:opacity-40"
          >
            Transaktion speichern
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

function buildPositionOptions(): PositionOption[] {
  const cards: Card[] = [
    getCard("charizard-ex"),
    getCard("mew-ex"),
    getCard("giratina-v"),
    getCard("umbreon-v"),
    getCard("lugia-v"),
    getCard("pikachu-promo"),
    getCard("rayquaza-vmax"),
    getCard("koraidon-ex"),
  ].filter(Boolean);

  const fromCards: PositionOption[] = cards.map((c) => ({
    id: `card-${c.id}`,
    label: `${c.name} (${c.setCode})`,
    kind: "Karte",
    cardId: c.id,
  }));

  const fromSealed: PositionOption[] = sealedProducts.map((s) => ({
    id: `sealed-${s.id}`,
    label: s.name,
    kind: "Sealed",
  }));

  return [...fromCards, ...fromSealed];
}
