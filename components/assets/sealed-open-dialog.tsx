"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  allocateSealedCost,
  formatOriginLine,
  type AllocationMethod,
} from "@/lib/cost-allocation";
import { formatCurrency } from "@/lib/format";
import { cards, getCard, type SealedProduct } from "@/lib/mock-data";
import { getCardPrice, type TcgCard } from "@/lib/pokemon-tcg";

type DraftCard = {
  id: string;
  cardId: string;
  name: string;
  setName?: string;
  marketValue: number;
  quantity: number;
};

type SearchHit = {
  cardId: string;
  name: string;
  setName: string;
  number?: string;
  marketValue: number;
  inSet: boolean;
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

const DEMO_PULLS = [
  { cardId: "charizard-ex", qty: 1 },
  { cardId: "mew-ex", qty: 1 },
  { cardId: "umbreon-v", qty: 1 },
  { cardId: "giratina-v", qty: 2 },
  { cardId: "pikachu-151", qty: 4 },
] as const;

function initialDrafts(): DraftCard[] {
  return DEMO_PULLS.map((p, i) => {
    const card = getCard(p.cardId);
    return {
      id: `pull-${i}-${p.cardId}`,
      cardId: p.cardId,
      name: card?.name ?? p.cardId,
      setName: card?.setName,
      marketValue: card?.price ?? 0,
      quantity: p.qty,
    };
  });
}

function setMatches(cardSet: string, productSet: string): boolean {
  const a = cardSet.toLowerCase().trim();
  const b = productSet.toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // "151" ↔ "Pokémon 151"
  const aDigits = a.replace(/\D/g, "");
  const bDigits = b.replace(/\D/g, "");
  if (aDigits && aDigits === bDigits && aDigits.length >= 3) return true;
  return false;
}

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
  const [drafts, setDrafts] = useState<DraftCard[]>(initialDrafts);
  const [cardSearch, setCardSearch] = useState("");
  const [apiHits, setApiHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchIdRef = useRef(0);

  // Reset when dialog opens for a product
  useEffect(() => {
    if (open) {
      setDrafts(initialDrafts());
      setCardSearch("");
      setApiHits([]);
      setShowResults(false);
      setMethod("market");
      setIncludeBulk(true);
      setBulkEstimate("25");
      setDone(false);
    }
  }, [open, product?.id]);

  // Close search results on outside click
  useEffect(() => {
    if (!showResults) return;
    function onDoc(e: MouseEvent) {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showResults]);

  const catalogHits = useMemo((): SearchHit[] => {
    const q = cardSearch.trim().toLowerCase();
    if (q.length < 1) return [];
    const productSet = product?.setName ?? "";
    return Object.values(cards)
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.number.toLowerCase().includes(q) ||
          c.setName.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      )
      .map((c) => ({
        cardId: c.id,
        name: c.name,
        setName: c.setName,
        number: c.number,
        marketValue: c.price,
        inSet: setMatches(c.setName, productSet),
      }))
      .sort((a, b) => {
        if (a.inSet !== b.inSet) return a.inSet ? -1 : 1;
        return a.name.localeCompare(b.name, "de");
      })
      .slice(0, 8);
  }, [cardSearch, product?.setName]);

  // Live API search (debounced) for fuller set catalog
  useEffect(() => {
    const q = cardSearch.trim();
    if (q.length < 2) {
      setApiHits([]);
      setSearching(false);
      return;
    }
    const id = ++searchIdRef.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          search: q,
          pageSize: "12",
          page: "1",
        });
        const res = await fetch(`/api/cards?${params}`);
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as { data?: TcgCard[] };
        if (id !== searchIdRef.current) return;
        const productSet = product?.setName ?? "";
        const hits: SearchHit[] = (json.data ?? []).map((c) => ({
          cardId: c.id,
          name: c.name,
          setName: c.set?.name ?? c.set?.id ?? "",
          number: c.number,
          marketValue: getCardPrice(c) ?? 0,
          inSet: setMatches(c.set?.name ?? "", productSet),
        }));
        hits.sort((a, b) => {
          if (a.inSet !== b.inSet) return a.inSet ? -1 : 1;
          return a.name.localeCompare(b.name, "de");
        });
        setApiHits(hits.slice(0, 10));
      } catch {
        if (id === searchIdRef.current) setApiHits([]);
      } finally {
        if (id === searchIdRef.current) setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [cardSearch, product?.setName]);

  const searchResults = useMemo(() => {
    // Merge catalog + API, prefer in-set, dedupe by cardId/name+set
    const map = new Map<string, SearchHit>();
    for (const h of [...catalogHits, ...apiHits]) {
      const key = h.cardId || `${h.name}|${h.setName}`;
      const existing = map.get(key);
      if (!existing || (h.inSet && !existing.inSet)) map.set(key, h);
    }
    return [...map.values()]
      .sort((a, b) => {
        if (a.inSet !== b.inSet) return a.inSet ? -1 : 1;
        return a.name.localeCompare(b.name, "de");
      })
      .slice(0, 10);
  }, [catalogHits, apiHits]);

  const addCard = useCallback((hit: SearchHit) => {
    setDrafts((prev) => {
      const existing = prev.find((d) => d.cardId === hit.cardId);
      if (existing) {
        return prev.map((d) =>
          d.cardId === hit.cardId
            ? { ...d, quantity: d.quantity + 1 }
            : d,
        );
      }
      return [
        ...prev,
        {
          id: `pull-${hit.cardId}-${Date.now()}`,
          cardId: hit.cardId,
          name: hit.name,
          setName: hit.setName,
          marketValue: hit.marketValue || 0.5,
          quantity: 1,
        },
      ];
    });
    setCardSearch("");
    setShowResults(false);
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const n = Math.max(1, Math.min(99, Math.round(qty) || 1));
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, quantity: n } : d)),
    );
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
    if (drafts.length === 0) return;
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
          costPerUnit: a?.costPerUnit ?? 0,
          costTotal: a?.costTotal ?? 0,
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
      <div className="fixed inset-x-4 top-[8%] z-50 mx-auto flex max-h-[84dvh] max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:inset-x-auto">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-5 py-4">
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
                  Geschätzter Marktwert des Bulk (€)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={bulkEstimate}
                  onChange={(e) =>
                    setBulkEstimate(e.target.value.replace(/[^\d.,]/g, ""))
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm tabular-nums outline-none focus:border-[var(--accent)]"
                />
                {bulkMarket > 0 && allocation.residual && (
                  <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                    → Bulk erhält{" "}
                    <span className="font-medium tabular-nums text-[var(--foreground)]">
                      {formatCurrency(allocation.residual.costTotal)}
                    </span>{" "}
                    EK (
                    {(
                      (allocation.residual.costTotal / Math.max(sealedCost, 1)) *
                      100
                    ).toLocaleString("de-DE", { maximumFractionDigits: 1 })}{" "}
                    % des Display-Preises). Karten-EK passt sich live an.
                  </p>
                )}
              </label>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Gezogene Karten
            </p>

            {/* Card search */}
            <div ref={searchWrapRef} className="relative z-20 mb-3">
              <label className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={cardSearch}
                  onChange={(e) => {
                    setCardSearch(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  placeholder={
                    product.setName
                      ? `Karte suchen (z. B. aus ${product.setName})…`
                      : "Karte suchen und hinzufügen…"
                  }
                  className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--background)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                  autoComplete="off"
                />
              </label>
              {showResults && cardSearch.trim().length > 0 && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-52 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-2xl ring-1 ring-black/20"
                >
                  {searching && searchResults.length === 0 && (
                    <li className="px-3 py-2 text-xs text-[var(--muted)]">
                      Suche…
                    </li>
                  )}
                  {!searching && searchResults.length === 0 && (
                    <li className="px-3 py-2 text-xs text-[var(--muted)]">
                      Keine Karten gefunden — anderen Namen versuchen
                    </li>
                  )}
                  {searchResults.map((hit) => {
                    const already = drafts.some((d) => d.cardId === hit.cardId);
                    return (
                      <li key={`${hit.cardId}-${hit.name}`}>
                        <button
                          type="button"
                          role="option"
                          onMouseDown={(e) => {
                            // mousedown before blur so click always registers
                            e.preventDefault();
                            addCard(hit);
                          }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--accent-soft)]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{hit.name}</p>
                            <p className="truncate text-[11px] text-[var(--muted)]">
                              {hit.setName}
                              {hit.number ? ` · #${hit.number}` : ""}
                              {hit.inSet && (
                                <span className="ml-1.5 text-[var(--accent)]">
                                  · aus diesem Set
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-[var(--accent)]">
                            {already ? "+1" : "Hinzufügen"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                Name tippen → Treffer anklicken. Set{" "}
                <span className="text-[var(--foreground)]">
                  {product.setName}
                </span>{" "}
                wird bevorzugt.
              </p>
            </div>

            <ul className="space-y-2">
              {drafts.length === 0 && (
                <li className="rounded-lg border border-dashed border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
                  Noch keine Karten — suche oben und füge Hits hinzu.
                </li>
              )}
              {drafts.map((d) => {
                const a = allocation.allocations.find((x) => x.id === d.id);
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {d.setName ? `${d.setName} · ` : ""}
                        MW {formatCurrency(d.marketValue)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQty(d.id, d.quantity - 1)}
                        disabled={d.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40"
                        aria-label="Menge verringern"
                      >
                        −
                      </button>
                      <span className="w-6 text-center tabular-nums text-sm">
                        {d.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(d.id, d.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                        aria-label="Menge erhöhen"
                      >
                        +
                      </button>
                    </div>
                    <div className="w-[4.5rem] text-right">
                      <p className="tabular-nums font-medium">
                        EK {formatCurrency(a?.costPerUnit ?? 0)}
                      </p>
                      <p className="tabular-nums text-[10px] text-[var(--muted)]">
                        Σ {formatCurrency(a?.costTotal ?? 0)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraft(d.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--negative)]"
                      aria-label={`${d.name} entfernen`}
                      title="Entfernen"
                    >
                      ×
                    </button>
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

        <div className="flex shrink-0 gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4">
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
            disabled={drafts.length === 0}
            className="h-10 flex-1 rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
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

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}
