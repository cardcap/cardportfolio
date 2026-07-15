"use client";

import { useMemo, useState } from "react";
import {
  allocateSealedCost,
  formatOriginLine,
  type AllocationMethod,
} from "@/lib/cost-allocation";
import { formatCurrency } from "@/lib/format";
import { getCard, type SealedProduct } from "@/lib/mock-data";

type DraftCard = {
  id: string;
  cardId: string;
  name: string;
  marketValue: number;
  quantity: number;
};

type SealedOpenDialogProps = {
  open: boolean;
  product: SealedProduct | null;
  onClose: () => void;
  onConfirm?: (result: {
    product: SealedProduct;
    method: AllocationMethod;
    cards: Array<{
      cardId: string;
      name: string;
      quantity: number;
      costPerUnit: number;
      costTotal: number;
      origin: string;
    }>;
    residual: { name: string; costTotal: number } | null;
  }) => void;
};

const PULL_OPTIONS = [
  { cardId: "charizard-ex", qty: 1 },
  { cardId: "mew-ex", qty: 1 },
  { cardId: "umbreon-v", qty: 1 },
  { cardId: "giratina-v", qty: 2 },
  { cardId: "pikachu-151", qty: 4 },
] as const;

export function SealedOpenDialog({
  open,
  product,
  onClose,
  onConfirm,
}: SealedOpenDialogProps) {
  const [method, setMethod] = useState<AllocationMethod>("market");
  const [includeBulk, setIncludeBulk] = useState(true);
  const [bulkEstimate, setBulkEstimate] = useState("25");
  const [done, setDone] = useState(false);

  const drafts: DraftCard[] = useMemo(() => {
    return PULL_OPTIONS.map((p, i) => {
      const card = getCard(p.cardId);
      return {
        id: `pull-${i}`,
        cardId: p.cardId,
        name: card.name,
        marketValue: card.price,
        quantity: p.qty,
      };
    });
  }, []);

  const sealedCost = product
    ? product.purchasePrice * product.quantity
    : 0;

  const bulkMarket = includeBulk
    ? Number.parseFloat(bulkEstimate.replace(",", ".")) || 0
    : 0;

  const allocation = useMemo(
    () =>
      allocateSealedCost({
        sealedCost,
        method,
        items: drafts.map((d) => ({
          id: d.id,
          name: d.name,
          marketValue: d.marketValue,
          quantity: d.quantity,
        })),
        bulkMarketValue: bulkMarket,
        sealedProductName: product?.name,
      }),
    [sealedCost, method, drafts, bulkMarket, product?.name],
  );

  if (!open || !product) return null;

  const openedAt = new Date();
  const origin = formatOriginLine({
    sealedProductName: product.name,
    openedAt,
  });

  function handleConfirm() {
    if (!product) return;
    const byId = new Map(allocation.allocations.map((a) => [a.id, a]));
    onConfirm?.({
      product,
      method,
      cards: drafts.map((d) => {
        const a = byId.get(d.id)!;
        return {
          cardId: d.cardId,
          name: d.name,
          quantity: d.quantity,
          costPerUnit: a.costPerUnit,
          costTotal: a.costTotal,
          origin,
        };
      }),
      residual: allocation.residual
        ? {
            name: allocation.residual.name,
            costTotal: allocation.residual.costTotal,
          }
        : null,
    });
    setDone(true);
    setTimeout(() => {
      setDone(false);
      onClose();
    }, 1000);
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/50"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-[8%] z-50 mx-auto max-h-[84dvh] max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:inset-x-auto">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Sealed öffnen</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm">
            <p className="text-[var(--muted)]">Einkaufspreis (gesamt)</p>
            <p className="tabular-nums text-xl font-semibold">
              {formatCurrency(sealedCost)}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {product.quantity}× {formatCurrency(product.purchasePrice)} EK
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              EK-Verteilung
            </p>
            <div className="grid gap-2">
              <MethodCard
                active={method === "market"}
                onClick={() => setMethod("market")}
                title="Nach Marktwert verteilen"
                badge="Empfehlung"
                description="Teurere Hits erhalten anteilig mehr EK, Commons weniger."
              />
              <MethodCard
                active={method === "equal"}
                onClick={() => setMethod("equal")}
                title="Gleichmäßig verteilen"
                description="Einfache Alternative – jeder Eintrag erhält denselben Anteil."
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] px-4 py-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={includeBulk}
                onChange={(e) => setIncludeBulk(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="text-sm font-medium">
                  Restposten „Bulk aus Display“ anlegen
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Wichtig, wenn du nur Hits erfasst. Sonst würde der komplette
                  Display-Preis auf wenige Karten fallen und deren EK wäre
                  unrealistisch hoch.
                </span>
              </span>
            </label>
            {includeBulk && (
              <label className="mt-3 block">
                <span className="text-xs text-[var(--muted)]">
                  Geschätzter Marktwert des Bulk
                </span>
                <input
                  type="text"
                  value={bulkEstimate}
                  onChange={(e) => setBulkEstimate(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                />
              </label>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Gezogene Karten (Demo / Scanner)
            </p>
            <ul className="space-y-2">
              {drafts.map((d) => {
                const a = allocation.allocations.find((x) => x.id === d.id);
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        ×{d.quantity} · MW {formatCurrency(d.marketValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums font-medium">
                        EK {formatCurrency(a?.costPerUnit ?? 0)}
                      </p>
                      <p className="tabular-nums text-[10px] text-[var(--muted)]">
                        Σ {formatCurrency(a?.costTotal ?? 0)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {allocation.residual && (
              <div className="mt-2 rounded-lg border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2 text-sm">
                <p className="font-medium text-[var(--accent)]">
                  {allocation.residual.name}
                </p>
                <p className="tabular-nums text-xs text-[var(--muted)]">
                  EK {formatCurrency(allocation.residual.costTotal)} ·{" "}
                  {allocation.residual.note}
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--muted)]">
            Bei der Karte später z. B.:{" "}
            <span className="text-[var(--foreground)]">
              EK: {formatCurrency(allocation.allocations[0]?.costPerUnit ?? 0)} ·{" "}
              {origin}
            </span>
          </p>

          {done && (
            <p className="rounded-lg bg-[var(--positive-soft)] px-3 py-2 text-sm text-[var(--positive)]">
              Karten mit verteiltem EK angelegt.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted)]"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-10 flex-1 rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110"
          >
            Öffnen &amp; übernehmen
          </button>
        </div>
      </div>
    </>
  );
}

function MethodCard({
  active,
  onClick,
  title,
  description,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
            active
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--border-strong)]"
          }`}
        >
          {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className="text-sm font-medium">{title}</span>
        {badge && (
          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium text-white">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1.5 pl-6 text-xs text-[var(--muted)]">{description}</p>
    </button>
  );
}
