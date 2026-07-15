"use client";

import { useEffect, useState } from "react";
import { CardImage } from "@/components/ui/card-image";
import { RAW_CONDITIONS } from "@/lib/card-conditions";
import { formatCurrency } from "@/lib/format";
import {
  getCardImageFallbacks,
  getCardImageUrl,
  getCardPrice,
  type TcgCard,
} from "@/lib/pokemon-tcg";
import type { SetDetail } from "@/lib/set-stats";

export type CollectionCopy = {
  id: string;
  condition: string;
  conditionShort: string;
  language: string;
  languageCode: string;
  variant: string;
  purchasePrice: number;
  purchaseDate: string;
  source: string;
  fees?: number;
  note?: string;
};

type CollectionEditPanelProps = {
  card: TcgCard;
  setDetail: SetDetail;
  official: number;
  initialCopies: CollectionCopy[];
  onClose: () => void;
  onSave?: (copies: CollectionCopy[]) => void;
  onSell?: () => void;
  onRemoveAll?: () => void;
};

const VARIANTS = [
  "Normal",
  "Normal Holo",
  "Reverse Holo",
  "Full Art",
  "Alt Art",
  "Promo",
] as const;

const LANGUAGES = [
  { code: "DE", label: "Deutsch" },
  { code: "EN", label: "Englisch" },
  { code: "JP", label: "Japanisch" },
  { code: "FR", label: "Französisch" },
] as const;

const SOURCES = [
  "Cardmarket",
  "Privatverkauf",
  "Messe",
  "Excel-Import",
  "Geöffnet aus Sealed",
  "eBay",
  "Sonstige",
] as const;

function shortCondition(c: string): string {
  if (c === "Near Mint") return "NM";
  if (c === "Mint") return "M";
  if (c === "Excellent") return "EX";
  if (c === "Good") return "GD";
  if (c === "Played") return "PL";
  if (c.startsWith("PSA")) return c.replace("PSA ", "PSA");
  return c.slice(0, 3).toUpperCase();
}

function parseDe(value: string): number {
  const cleaned = value.replace(/[€\s]/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function CollectionEditPanel({
  card,
  setDetail,
  official,
  initialCopies,
  onClose,
  onSave,
  onSell,
  onRemoveAll,
}: CollectionEditPanelProps) {
  const [copies, setCopies] = useState<CollectionCopy[]>(initialCopies);
  const [showAddForm, setShowAddForm] = useState(initialCopies.length === 0);
  const [purchaseOpen, setPurchaseOpen] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  // New copy form
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState<string>("Near Mint");
  const [variant, setVariant] = useState<string>("Normal Holo");
  const [language, setLanguage] = useState("Deutsch");
  const [purchaseDate, setPurchaseDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [ek, setEk] = useState("0,00");
  const [fees, setFees] = useState("0,00");
  const [source, setSource] = useState<string>("Cardmarket");
  const [note, setNote] = useState("");

  useEffect(() => {
    setCopies(initialCopies);
    setShowAddForm(initialCopies.length === 0);
  }, [initialCopies, card.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const num = (() => {
    const raw = (card.number || "").split("/")[0];
    const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  })();

  const collectorLabel =
    card.collectorId ??
    (num > 0
      ? `${String(num).padStart(3, "0")}/${String(official).padStart(3, "0")}`
      : card.number);

  const totalQty = copies.length;
  const market = getCardPrice(card);

  function removeCopy(id: string) {
    setCopies((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSaveExemplar() {
    const lang = LANGUAGES.find((l) => l.label === language) ?? LANGUAGES[0];
    const newCopies: CollectionCopy[] = [];
    for (let i = 0; i < qty; i++) {
      newCopies.push({
        id: `copy-${Date.now()}-${i}`,
        condition,
        conditionShort: shortCondition(condition),
        language: lang.label,
        languageCode: lang.code,
        variant,
        purchasePrice: parseDe(ek),
        purchaseDate: purchaseDate
          ? purchaseDate.split("-").reverse().join(".")
          : "",
        source,
        fees: parseDe(fees),
        note: note.trim() || undefined,
      });
    }
    const next = [...copies, ...newCopies];
    setCopies(next);
    setShowAddForm(false);
    setQty(1);
    setEk("0,00");
    setFees("0,00");
    setNote("");
    setSavedFlash(true);
    onSave?.(next);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  function handleSaveAll() {
    onSave?.(copies);
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      onClose();
    }, 600);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Schließen"
        className="fixed inset-0 z-40 bg-black/40 lg:bg-black/25"
        onClick={onClose}
      />
      <aside className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 flex max-h-[min(90dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:inset-y-4 lg:right-4 lg:bottom-4 lg:top-4 lg:w-[min(100vw-2rem,26rem)] lg:max-h-none lg:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md">
            <CardImage
              src={getCardImageUrl(card)}
              alt={card.name}
              fallbacks={getCardImageFallbacks(card)}
              size="sm"
              className="!h-14 !w-10"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight">
              {card.name} bearbeiten
            </h2>
            <p className="truncate text-xs text-[var(--muted)]">
              {setDetail.name} · {collectorLabel}
            </p>
            <p
              className={`mt-1 text-xs font-medium ${
                totalQty > 0
                  ? "text-[var(--positive)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {totalQty > 0 ? (
                <>
                  <span className="mr-1">✓</span>
                  {totalQty} Exemplar{totalQty === 1 ? "" : "e"} in deiner
                  Sammlung
                </>
              ) : (
                "Noch nicht in der Sammlung"
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          {/* Existing copies */}
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Deine Exemplare
            </h3>
            {copies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-center text-sm text-[var(--muted)]">
                Noch keine Exemplare erfasst.
              </p>
            ) : (
              <ul className="space-y-2">
                {copies.map((copy, index) => (
                  <li
                    key={copy.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium">
                            Exemplar {index + 1}
                          </span>
                          <span className="rounded-md bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-[var(--border)]">
                            {copy.conditionShort}
                          </span>
                          <span className="rounded-md bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-[var(--border)]">
                            {copy.languageCode}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          Variante: {copy.variant}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          Kaufdatum: {copy.purchaseDate || "—"}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="text-right">
                          <p className="tabular-nums text-sm font-medium">
                            EK: {formatCurrency(copy.purchasePrice)}
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">
                            Quelle: {copy.source}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCopy(copy.id)}
                          className="text-[var(--muted)] hover:text-[var(--negative)]"
                          aria-label="Exemplar entfernen"
                          title="Entfernen"
                        >
                          ⋮
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-sm font-medium text-[var(--accent)] hover:opacity-80"
            >
              + Weiteres Exemplar hinzufügen
            </button>
          </section>

          {/* Add form */}
          {showAddForm && (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
              <h3 className="mb-3 text-sm font-medium">
                Neues Exemplar hinzufügen
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Menge
                  </label>
                  <div className="flex h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="flex h-full w-10 items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      −
                    </button>
                    <span className="tabular-nums flex-1 text-center text-sm font-medium">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(20, q + 1))}
                      className="flex h-full w-10 items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Zustand
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    {RAW_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c === "Near Mint" ? "Near Mint (NM)" : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Variante
                  </label>
                  <select
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    {VARIANTS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Sprache
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.label}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purchase data accordion */}
              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <button
                  type="button"
                  onClick={() => setPurchaseOpen((o) => !o)}
                  className="flex w-full items-center justify-between text-sm font-medium"
                >
                  Kaufdaten (optional)
                  <span className="text-[var(--muted)]">
                    {purchaseOpen ? "▴" : "▾"}
                  </span>
                </button>

                {purchaseOpen && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          Kaufdatum
                        </label>
                        <input
                          type="date"
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          EK / Stück
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ek}
                          onChange={(e) => setEk(e.target.value)}
                          placeholder="0,00 €"
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          Gebühren
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fees}
                          onChange={(e) => setFees(e.target.value)}
                          placeholder="0,00 €"
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          Bezugsquelle
                        </label>
                        <select
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                        >
                          <option value="">Auswählen</option>
                          {SOURCES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          Notiz (optional)
                        </label>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="z. B. Verkäufer oder Bestellnummer"
                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>

                    <p className="flex items-start gap-1.5 text-[11px] text-[var(--muted)]">
                      <span aria-hidden>ℹ</span>
                      Ein neues Exemplar wird als eigener Kauf gespeichert.
                      {market != null && (
                        <>
                          {" "}
                          Marktwert aktuell: {formatCurrency(market)}
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {savedFlash && (
                <p className="mt-3 rounded-lg bg-[var(--positive-soft)] px-3 py-2 text-sm text-[var(--positive)]">
                  Exemplar gespeichert.
                </p>
              )}
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onSell}
            className="h-10 flex-1 rounded-full border border-[var(--border)] px-3 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] sm:flex-none"
          >
            Verkauf erfassen
          </button>
          <button
            type="button"
            onClick={() => {
              setCopies([]);
              onRemoveAll?.();
            }}
            disabled={copies.length === 0}
            className="h-10 flex-1 rounded-full border border-[var(--negative)]/30 px-3 text-sm font-medium text-[var(--negative)] hover:bg-[var(--negative-soft)] disabled:opacity-40 sm:flex-none"
          >
            Aus Sammlung entfernen
          </button>
          <button
            type="button"
            onClick={() => {
              if (showAddForm) handleSaveExemplar();
              else handleSaveAll();
            }}
            className="h-10 min-w-[8rem] flex-[1.2] rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white hover:brightness-110"
          >
            Exemplar speichern
          </button>
        </div>
      </aside>
    </>
  );
}

/** Build demo copies from owned qty for set checklist */
export function demoCopiesFromQty(
  cardId: string,
  qty: number,
  marketPrice: number | null,
): CollectionCopy[] {
  if (qty <= 0) return [];
  const ek = marketPrice != null ? Math.round(marketPrice * 0.73 * 100) / 100 : 0;
  return Array.from({ length: Math.min(qty, 5) }, (_, i) => ({
    id: `demo-${cardId}-${i}`,
    condition: "Near Mint",
    conditionShort: "NM",
    language: "Deutsch",
    languageCode: "DE",
    variant: i === 0 ? "Normal Holo" : "Normal",
    purchasePrice: ek,
    purchaseDate: "12.05.2024",
    source: "Cardmarket",
  }));
}
