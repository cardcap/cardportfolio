"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SealedProductImage } from "@/components/ui/sealed-product-image";
import { formatCurrency, formatDateDE } from "@/lib/format";
import type { SealedCategory, SealedProduct } from "@/lib/mock-data";

const CONDITIONS: SealedProduct["condition"][] = [
  "OVP",
  "leichte Mängel",
  "beschädigt",
];

const LANGUAGES: SealedProduct["language"][] = ["DE", "EN", "JP"];

const CATEGORIES: SealedCategory[] = [
  "Display",
  "Elite Trainer Box",
  "Booster Bundle",
  "Kollektion",
  "Tin",
  "Blister",
];

function parseEuro(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatEuroInput(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  // dd.mm.yyyy
  const m = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
}

function formatPurchaseDate(value?: string | null): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDateDE(value);
  return value;
}

export type SealedDetailSave = {
  quantity: number;
  condition: SealedProduct["condition"];
  language: SealedProduct["language"];
  category: SealedCategory;
  purchasePrice: number;
  purchaseDate: string | null;
  marketValue: number;
};

type SealedDetailPanelProps = {
  product: SealedProduct;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onOpenProduct?: () => void;
  onDelete?: () => void | Promise<void>;
  onSave?: (patch: SealedDetailSave) => void | Promise<void>;
  busy?: boolean;
};

export function SealedDetailPanel({
  product,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  onOpenProduct,
  onDelete,
  onSave,
  busy = false,
}: SealedDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [qty, setQty] = useState(String(product.quantity));
  const [condition, setCondition] = useState(product.condition);
  const [language, setLanguage] = useState(product.language);
  const [category, setCategory] = useState(product.category);
  const [ek, setEk] = useState(formatEuroInput(product.purchasePrice));
  const [mw, setMw] = useState(formatEuroInput(product.marketValue));
  const [date, setDate] = useState(toDateInput(product.purchaseDate));

  // Reset form when product changes
  useEffect(() => {
    setEditing(false);
    setQty(String(product.quantity));
    setCondition(product.condition);
    setLanguage(product.language);
    setCategory(product.category);
    setEk(formatEuroInput(product.purchasePrice));
    setMw(formatEuroInput(product.marketValue));
    setDate(toDateInput(product.purchaseDate));
  }, [product.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, onClose]);

  const quantity = Math.max(1, product.quantity);
  const totalCost = product.purchasePrice * quantity;
  const totalMarket = product.marketValue * quantity;
  const profit = totalMarket - totalCost;
  const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const positive = profit >= 0;

  async function handleSave() {
    if (!onSave) return;
    const q = Math.max(1, Math.floor(Number.parseInt(qty, 10) || 1));
    const purchasePrice = parseEuro(ek);
    const marketValue = parseEuro(mw);
    if (purchasePrice == null || marketValue == null) {
      window.alert("Bitte gültige Preise eingeben (z. B. 12,50).");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        quantity: q,
        condition,
        language,
        category,
        purchasePrice,
        purchaseDate: date.trim() || null,
        marketValue,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Detailansicht schließen"
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose}
      />
      <aside className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 flex max-h-[min(88dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:inset-x-auto lg:inset-y-4 lg:left-auto lg:right-4 lg:bottom-4 lg:top-4 lg:w-[min(100vw-2rem,26rem)] lg:max-h-none lg:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrev || busy}
              onClick={onPrev}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)] disabled:opacity-30"
              aria-label="Vorheriges Produkt"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={!hasNext || busy}
              onClick={onNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)] disabled:opacity-30"
              aria-label="Nächstes Produkt"
            >
              ›
            </button>
            <p className="ml-1 text-sm font-medium">
              {editing ? "Bearbeiten" : "Details"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="flex gap-3">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <SealedProductImage
                src={product.imageUrl}
                fallbacks={product.imageFallbacks}
                alt={product.name}
                size="sm"
                className="!h-full !w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight">
                {product.name}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {product.setName}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge>{product.category}</Badge>
                <Badge>{product.language}</Badge>
                <Badge tone={conditionTone(product.condition)}>
                  {product.condition}
                </Badge>
              </div>
            </div>
          </div>

          {!editing ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                <Stat
                  label="Bestand"
                  value={`×${product.quantity}`}
                />
                <Stat
                  label="Kaufdatum"
                  value={formatPurchaseDate(product.purchaseDate)}
                />
                <Stat
                  label="EK / Stück"
                  value={formatCurrency(product.purchasePrice)}
                />
                <Stat
                  label="MW / Stück"
                  value={formatCurrency(product.marketValue)}
                />
                <Stat label="EK gesamt" value={formatCurrency(totalCost)} />
                <Stat
                  label="Marktwert gesamt"
                  value={formatCurrency(totalMarket)}
                />
              </div>

              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Gewinn / Verlust
                </p>
                <p
                  className={`tabular-nums mt-0.5 text-xl font-semibold ${
                    positive
                      ? "text-[var(--positive)]"
                      : profit < 0
                        ? "text-[var(--negative)]"
                        : ""
                  }`}
                >
                  {positive ? "+" : ""}
                  {formatCurrency(profit)}
                </p>
                <p
                  className={`tabular-nums text-xs ${
                    positive
                      ? "text-[var(--positive)]"
                      : profit < 0
                        ? "text-[var(--negative)]"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {positive ? "+" : ""}
                  {profitPct.toLocaleString("de-DE", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  %
                </p>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <DataRow label="Kategorie" value={product.category} />
                <DataRow label="Sprache" value={languageLabel(product.language)} />
                <DataRow label="Zustand" value={product.condition} />
                <DataRow label="Set" value={product.setName} />
              </dl>
            </>
          ) : (
            <div className="mt-5 space-y-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-[var(--muted)]">Bestand (Stück)</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[var(--muted)]">Kategorie</span>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as SealedCategory)
                  }
                  className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[var(--muted)]">Sprache</span>
                <select
                  value={language}
                  onChange={(e) =>
                    setLanguage(e.target.value as SealedProduct["language"])
                  }
                  className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {languageLabel(l)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[var(--muted)]">Zustand</span>
                <select
                  value={condition}
                  onChange={(e) =>
                    setCondition(
                      e.target.value as SealedProduct["condition"],
                    )
                  }
                  className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[var(--muted)]">EK / Stück (€)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={ek}
                  onChange={(e) => setEk(e.target.value)}
                  placeholder="0,00"
                  className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[var(--muted)]">
                  Marktwert / Stück (€)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={mw}
                  onChange={(e) => setMw(e.target.value)}
                  placeholder="0,00"
                  className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 tabular-nums"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[var(--muted)]">Kaufdatum</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 space-y-2 border-t border-[var(--border)] px-4 py-3">
          {!editing ? (
            <>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                Bearbeiten
              </Button>
              {onOpenProduct && (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={onOpenProduct}
                >
                  Produkt öffnen
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void onDelete()}
                >
                  Aus Inventar entfernen
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                className="w-full"
                disabled={busy || saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Speichern…" : "Speichern"}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={busy || saving}
                onClick={() => {
                  setEditing(false);
                  setQty(String(product.quantity));
                  setCondition(product.condition);
                  setLanguage(product.language);
                  setCategory(product.category);
                  setEk(formatEuroInput(product.purchasePrice));
                  setMw(formatEuroInput(product.marketValue));
                  setDate(toDateInput(product.purchaseDate));
                }}
              >
                Abbrechen
              </Button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function languageLabel(lang: string): string {
  if (lang === "DE") return "Deutsch";
  if (lang === "EN") return "Englisch";
  if (lang === "JP") return "Japanisch";
  return lang;
}

function conditionTone(
  condition: string,
): "neutral" | "ok" | "warn" | "bad" {
  if (condition === "OVP") return "ok";
  if (condition === "leichte Mängel") return "warn";
  if (condition === "beschädigt") return "bad";
  return "neutral";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad";
}) {
  const styles =
    tone === "ok"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-300 ring-amber-400/25"
        : tone === "bad"
          ? "bg-red-500/15 text-red-300 ring-red-400/25"
          : "bg-[var(--surface-elevated)] text-[var(--muted)] ring-[var(--border)]";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${styles}`}
    >
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="tabular-nums mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}
