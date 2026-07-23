"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardImage } from "@/components/ui/card-image";
import { ConditionBadge } from "@/components/ui/condition-badge";
import { InfoTip } from "@/components/ui/metric-card";
import { useWishlist } from "@/components/wishlist-provider";
import { formatCurrency, formatDateDE } from "@/lib/format";
import { MARKET_PRICE_DISCLAIMER } from "@/components/ui/price";
import {
  getCardImageFallbacks,
  getCardImageUrl,
  getCardPrice,
  type TcgCard,
} from "@/lib/pokemon-tcg";
import {
  conditionRank,
  sortConditionsWorstFirst,
} from "@/lib/card-conditions";
import { formatRarityEnglish } from "@/lib/rarity-labels";
import type { SetDetail } from "@/lib/set-stats";
import { wishlistItemFromTcg } from "@/lib/wishlist";

type PriceRange = "7T" | "30T" | "1J";

/** Per-copy snapshot for multi-exemplar cards */
export type CollectionExemplarDetail = {
  condition: string;
  purchasePrice: number | null;
  purchaseDate?: string | null;
};

/** Real collection snapshot (Assets) — overrides demo EK/Gewinn/Zustand */
export type CollectionDetails = {
  condition: string;
  purchasePrice: number;
  profit: number;
  purchaseDate?: string | null;
  marketValue?: number;
  /** Individual exemplars (condition / EK / Kaufdatum) */
  exemplars?: CollectionExemplarDetail[];
};

type SetCardDetailPanelProps = {
  card: TcgCard;
  setDetail: SetDetail;
  official: number;
  qty: number;
  positionLabel: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onAddToWishlist?: () => void;
  /** Add +1 to collection (may be async) */
  onEditCollection?: () => void | Promise<void>;
  /** Real collection values instead of demo estimates */
  collectionDetails?: CollectionDetails | null;
  /** Override primary collection button label */
  collectionButtonLabel?: string;
  onRemoveFromCollection?: () => void;
  /** Hide “Sammlungsdetails ansehen” (e.g. already on Assets) */
  hideCollectionLink?: boolean;
  /** Language badge override (default DE) */
  languageLabel?: string;
};

function buildPriceHistory(current: number, range: PriceRange): { label: string; value: number }[] {
  const points =
    range === "7T" ? 7 : range === "30T" ? 12 : 14;
  const startFactor = range === "7T" ? 0.94 : range === "30T" ? 0.88 : 0.72;
  const out: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const wave = Math.sin(i * 0.7) * current * 0.02;
    const value = Math.round((current * (startFactor + (1 - startFactor) * t) + wave) * 100) / 100;
    const d = new Date(now);
    d.setDate(d.getDate() - (points - 1 - i) * (range === "1J" ? 26 : range === "30T" ? 2.5 : 1));
    out.push({
      label: d.toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
      value: Math.max(0.01, value),
    });
  }
  out[out.length - 1].value = current;
  return out;
}

function shortConditionLabel(condition: string): string {
  if (condition === "Mint") return "M";
  if (condition === "Near Mint") return "NM";
  if (condition === "Excellent") return "EX";
  if (condition === "Good") return "GD";
  if (condition === "Light Played") return "LP";
  if (condition === "Played") return "PL";
  if (condition === "Poor") return "PO";
  if (condition.startsWith("PSA")) return condition.replace("PSA ", "PSA");
  return condition.slice(0, 3).toUpperCase();
}

export function SetCardDetailPanel({
  card,
  setDetail,
  official,
  qty,
  positionLabel,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onAddToWishlist,
  onEditCollection,
  collectionDetails,
  collectionButtonLabel,
  onRemoveFromCollection,
  hideCollectionLink = false,
  languageLabel = "DE",
}: SetCardDetailPanelProps) {
  const [priceRange, setPriceRange] = useState<PriceRange>("30T");
  const [addFeedback, setAddFeedback] = useState<
    "idle" | "loading" | "success"
  >("idle");
  const [pulseKey, setPulseKey] = useState(0);
  const addFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isInWishlist, toggleItem } = useWishlist();
  const onWishlist = isInWishlist(card.id);

  useEffect(() => {
    return () => {
      if (addFeedbackTimer.current) clearTimeout(addFeedbackTimer.current);
    };
  }, []);

  // Reset feedback when switching cards
  useEffect(() => {
    setAddFeedback("idle");
    if (addFeedbackTimer.current) clearTimeout(addFeedbackTimer.current);
  }, [card.id]);

  const handleAddToCollection = useCallback(async () => {
    if (!onEditCollection || addFeedback === "loading") return;
    setAddFeedback("loading");
    setPulseKey((k) => k + 1);
    try {
      await onEditCollection();
      setPulseKey((k) => k + 1);
      setAddFeedback("success");
      if (addFeedbackTimer.current) clearTimeout(addFeedbackTimer.current);
      addFeedbackTimer.current = setTimeout(() => {
        setAddFeedback("idle");
      }, 1800);
    } catch {
      setAddFeedback("idle");
    }
  }, [onEditCollection, addFeedback]);
  const price =
    collectionDetails?.marketValue != null && qty > 0
      ? collectionDetails.marketValue / Math.max(1, qty)
      : (getCardPrice(card) ?? 0);
  const hasPrice =
    collectionDetails?.marketValue != null
      ? collectionDetails.marketValue > 0 || price > 0
      : getCardPrice(card) != null;

  // Real collection values when provided; otherwise demo cost basis when owned
  const purchasePrice =
    collectionDetails != null
      ? collectionDetails.purchasePrice
      : qty > 0
        ? Math.round(price * 0.73 * 100) / 100
        : 0;
  const profit =
    collectionDetails != null
      ? collectionDetails.profit
      : qty > 0 && hasPrice
        ? Math.round((price - purchasePrice) * 100) / 100
        : 0;
  const exemplarsRaw = collectionDetails?.exemplars ?? [];
  // Worst → best for display (PO … MT), like Cardmarket / mock
  const exemplars = useMemo(() => {
    if (exemplarsRaw.length === 0) return [];
    return [...exemplarsRaw].sort(
      (a, b) =>
        conditionRank(a.condition || "Near Mint") -
        conditionRank(b.condition || "Near Mint"),
    );
  }, [exemplarsRaw]);

  const uniqueConditions = useMemo(() => {
    const list = (
      exemplars.length > 0
        ? exemplars.map((e) => e.condition)
        : collectionDetails?.condition
          ? [collectionDetails.condition]
          : []
    ).filter(Boolean) as string[];
    return sortConditionsWorstFirst([...new Set(list)]);
  }, [exemplars, collectionDetails?.condition]);

  const multiConditions = uniqueConditions.length > 1;
  // Range worst → best, e.g. "PO – MT" or "PL – NM"
  const conditionLabel = multiConditions
    ? `${shortConditionLabel(uniqueConditions[0])} – ${shortConditionLabel(uniqueConditions[uniqueConditions.length - 1])}`
    : collectionDetails?.condition
      ? shortConditionLabel(collectionDetails.condition)
      : "NM";
  const conditionTitle = multiConditions
    ? uniqueConditions.join(", ")
    : collectionDetails?.condition;
  const change30 = hasPrice && collectionDetails == null ? 5.3 : hasPrice ? 0 : 0;

  const history = useMemo(
    () => (hasPrice ? buildPriceHistory(price, priceRange) : []),
    [hasPrice, price, priceRange],
  );

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

  const typeLabel = card.types?.[0];
  const rarityLabel = card.rarity ? formatRarityEnglish(card.rarity) : null;

  const canPrev = Boolean(hasPrev && onPrev);
  const canNext = Boolean(hasNext && onNext);

  const goPrev = useCallback(
    (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      if (canPrev) onPrev?.();
    },
    [canPrev, onPrev],
  );

  const goNext = useCallback(
    (e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      if (canNext) onNext?.();
    },
    [canNext, onNext],
  );

  /** Horizontal drag (document-level so release outside panel still counts) */
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_PX = 48;

  const onPanelPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = e.target as HTMLElement | null;
    // Don't start swipe on controls — let buttons work normally
    if (
      el?.closest(
        "button, a, input, select, textarea, label, [role='button'], [role='switch']",
      )
    ) {
      swipeStart.current = null;
      return;
    }
    swipeStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // keep start; evaluation on up
      void e;
    };
    const onUp = (e: PointerEvent) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.1) return;
      // Drag right → next, drag left → previous
      if (dx > 0) goNext();
      else goPrev();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [goNext, goPrev]);

  // Keyboard: ← → Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  const panelRef = useRef<HTMLElement | null>(null);

  // Click outside closes — without blocking page scroll (no full-screen hit target)
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      // Don't close when interacting with other fixed UI (modals etc.)
      const el = target as HTMLElement;
      if (el.closest?.("[data-keep-detail-open]")) return;
      onClose();
    };
    // capture phase so we run before other handlers that might stopPropagation
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [onClose]);

  return (
    <>
      {/* Visual dimmer only — pointer-events-none so the page stays scrollable */}
      <div
        className="pointer-events-none fixed inset-0 z-40 bg-black/25 lg:bg-black/15"
        aria-hidden
      />
      <aside
        ref={panelRef}
        className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 flex max-h-[min(88dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl touch-pan-y lg:inset-x-auto lg:inset-y-4 lg:left-auto lg:right-4 lg:bottom-4 lg:top-4 lg:w-[min(100vw-2rem,26rem)] lg:max-h-none lg:rounded-2xl"
        onPointerDown={onPanelPointerDown}
      >
        {/* Header nav: larger prev/next buttons, no position number */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
          <div className="flex items-center gap-2" aria-label={positionLabel}>
            <button
              type="button"
              onClick={goPrev}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!canPrev}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--foreground)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-30"
              aria-label="Vorherige Karte"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 6 9 12l6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!canNext}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--foreground)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-30"
              aria-label="Nächste Karte"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Schließen"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {/* Title + full card image on the right (desktop) */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 order-2 sm:order-1">
              <h2 className="text-lg font-semibold leading-tight tracking-tight">
                {card.name}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {setDetail.name}
                <span className="mx-1 opacity-40">·</span>
                {collectorLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge>{languageLabel}</Badge>
                {typeLabel && <Badge>{typeLabel}</Badge>}
                {rarityLabel && <Badge>{rarityLabel}</Badge>}
                {collectionDetails?.condition && (
                  <Badge>{collectionDetails.condition}</Badge>
                )}
              </div>

              <div className="mt-4">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  Aktueller Marktwert
                  <InfoTip
                    text={`Durchschnittspreis (Cardmarket-Trend). ${MARKET_PRICE_DISCLAIMER} — Richtwert, kein Verkaufsgarantie. Kann je nach Zustand, Sprache und Angebot abweichen.`}
                  />
                </p>
                <p className="tabular-nums mt-0.5 text-2xl font-semibold tracking-tight">
                  {hasPrice ? formatCurrency(price) : "—"}
                </p>
                {hasPrice && change30 !== 0 && (
                  <p className="tabular-nums text-xs text-[var(--positive)]">
                    +{change30.toLocaleString("de-DE")} % (30 Tage)
                  </p>
                )}
              </div>
            </div>
            <div className="mx-auto w-[min(100%,11.5rem)] shrink-0 order-1 sm:order-2 sm:mx-0 sm:w-[48%]">
              <CardImage
                src={getCardImageUrl(card) || card.images?.large || card.images?.small}
                alt={card.name}
                fallbacks={
                  card.imageFallbacks?.length
                    ? card.imageFallbacks
                    : getCardImageFallbacks(card)
                }
                types={card.types}
                hoverGlow
                size="lg"
                className="!w-full !rounded-xl shadow-lg ring-1 ring-white/10"
              />
            </div>
          </div>

          {/* Price chart */}
          {hasPrice && history.length > 1 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--muted)]">
                  Preisentwicklung
                </p>
                <div className="flex rounded-lg border border-[var(--border)] p-0.5">
                  {(["7T", "30T", "1J"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPriceRange(r)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        priceRange === r
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <MiniPriceChart data={history} />
            </div>
          )}

          {/* Card data */}
          <div className="mt-5">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Kartendaten
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <DataRow label="Sammelnummer" value={collectorLabel} />
              <DataRow
                label="Sprache"
                value={
                  languageLabel === "DE"
                    ? "Deutsch"
                    : languageLabel === "EN"
                      ? "Englisch"
                      : languageLabel
                }
              />
              <DataRow label="Seltenheit" value={rarityLabel ?? "—"} />
              <DataRow
                label="Erscheinungsdatum"
                value={
                  // Always the set’s release date (never purchase date)
                  setDetail.releaseDate
                    ? formatDateDE(setDetail.releaseDate)
                    : "—"
                }
              />
              <DataRow
                label="Kategorie"
                value={card.category ?? typeLabel ?? "Pokémon"}
              />
              {qty <= 1 &&
                collectionDetails?.purchaseDate &&
                collectionDetails.purchaseDate !== "—" && (
                  <DataRow
                    label="Kaufdatum"
                    value={
                      /^\d{4}-\d{2}-\d{2}/.test(collectionDetails.purchaseDate)
                        ? formatDateDE(collectionDetails.purchaseDate)
                        : collectionDetails.purchaseDate
                    }
                  />
                )}
            </dl>
          </div>

          {/* Collection status */}
          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              In deiner Sammlung
              {qty > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-[var(--positive)]">
                  <span className="text-[var(--positive)]">✓</span>
                  {qty} Exemplar{qty === 1 ? "" : "e"} vorhanden
                </span>
              ) : (
                <span className="text-xs font-normal text-[var(--muted)]">
                  Noch nicht vorhanden
                </span>
              )}
            </div>

            {qty > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-[var(--surface)] px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Zustand
                    </p>
                    <p
                      className={`mt-0.5 font-medium tabular-nums ${
                        multiConditions ? "text-[var(--accent)]" : ""
                      }`}
                      title={conditionTitle}
                    >
                      {conditionLabel}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface)] px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      EK{qty > 1 ? " Ø" : ""}
                    </p>
                    <p className="tabular-nums mt-0.5 font-medium">
                      {formatCurrency(purchasePrice)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface)] px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Gewinn
                    </p>
                    <p
                      className={`tabular-nums mt-0.5 font-medium ${
                        profit > 0
                          ? "text-[var(--positive)]"
                          : profit < 0
                            ? "text-[var(--negative)]"
                            : "text-[var(--muted)]"
                      }`}
                    >
                      {profit > 0 ? "+" : ""}
                      {formatCurrency(profit)}
                    </p>
                  </div>
                </div>

                {qty > 1 && (
                  <details
                    className="group mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] open:pb-1"
                    open
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
                      <span>
                        Deine Exemplare
                        <span className="ml-1.5 font-normal text-[var(--muted)]">
                          ({qty})
                        </span>
                      </span>
                      <span
                        className="text-[var(--muted)] transition-transform group-open:rotate-90"
                        aria-hidden
                      >
                        ›
                      </span>
                    </summary>
                    <ul className="space-y-1.5 px-2 pb-2">
                      {(exemplars.length > 0
                        ? exemplars
                        : Array.from({ length: qty }, () => ({
                            condition:
                              collectionDetails?.condition || "Near Mint",
                            purchasePrice:
                              collectionDetails?.purchasePrice ?? purchasePrice,
                            purchaseDate: collectionDetails?.purchaseDate,
                          }))
                      ).map((ex, i) => {
                        const exCond = ex.condition || "Near Mint";
                        const exEk =
                          ex.purchasePrice ??
                          collectionDetails?.purchasePrice ??
                          purchasePrice;
                        const exDate = ex.purchaseDate;
                        const dateLabel =
                          exDate && exDate !== "—"
                            ? /^\d{4}-\d{2}-\d{2}/.test(exDate)
                              ? formatDateDE(exDate)
                              : exDate
                            : "—";
                        return (
                          <li
                            key={`${exCond}-${i}`}
                            className="flex flex-col gap-1 rounded-md bg-[var(--background)] px-2.5 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-xs text-[var(--muted)]">
                                Exemplar {i + 1}
                              </span>
                              <ConditionBadge condition={exCond} short />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-[var(--muted)]">
                              <span>EK {formatCurrency(exEk)}</span>
                              <span>Kauf {dateLabel}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                )}

                {!hideCollectionLink && (
                  <Link
                    href="/assets/karten"
                    className="mt-3 inline-block text-xs font-medium text-[var(--accent)] hover:opacity-80"
                  >
                    Sammlungsdetails ansehen →
                  </Link>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                Füge die Karte hinzu, um EK und Gewinn zu tracken.
              </p>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              key={pulseKey}
              onClick={() => void handleAddToCollection()}
              disabled={addFeedback === "loading" || !onEditCollection}
              aria-live="polite"
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition-[filter,background-color] hover:brightness-110 disabled:opacity-80 ${
                addFeedback === "success"
                  ? "bg-emerald-500"
                  : "bg-[var(--accent)]"
              } ${
                // Only pulse after click (pulseKey starts at 0)
                pulseKey > 0 ? "collection-add-pulse" : ""
              }`}
            >
              {addFeedback === "loading"
                ? "Wird hinzugefügt…"
                : addFeedback === "success"
                  ? "✓ Hinzugefügt"
                  : (collectionButtonLabel ??
                    (qty > 0
                      ? `In Sammlung (×${qty}) · +1 hinzufügen`
                      : "Zur Sammlung hinzufügen"))}
            </button>
            {addFeedback === "success" && (
              <p className="text-center text-xs font-medium text-emerald-400">
                Karte ist in deiner Sammlung
              </p>
            )}
            {onRemoveFromCollection && qty > 0 && (
              <button
                type="button"
                onClick={onRemoveFromCollection}
                className="flex h-11 w-full items-center justify-center rounded-full border border-[var(--negative)]/40 bg-[var(--negative-soft)] text-sm font-medium text-[var(--negative)] hover:brightness-110"
              >
                Aus Sammlung entfernen
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                // Toggle once via context (parent onAddToWishlist may also toggle — avoid double call)
                if (onAddToWishlist) {
                  onAddToWishlist();
                } else {
                  toggleItem(wishlistItemFromTcg(card));
                }
              }}
              aria-pressed={onWishlist}
              aria-label={
                onWishlist
                  ? "Von der Wunschliste entfernen"
                  : "Zur Wunschliste hinzufügen"
              }
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all ${
                onWishlist
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-2 ring-[var(--accent)] shadow-[0_0_0_1px_var(--accent)] hover:brightness-110"
                  : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              }`}
            >
              {onWishlist ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  ✓ Auf der Wunschliste
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Zur Wunschliste hinzufügen
                </>
              )}
            </button>
            {onWishlist && (
              <p className="text-center text-[11px] text-[var(--muted)]">
                Tippen zum Entfernen ·{" "}
                <Link
                  href="/wunschliste"
                  className="font-medium text-[var(--accent)] hover:opacity-80"
                >
                  Wunschliste öffnen →
                </Link>
              </p>
            )}
            {!onWishlist && (
              <Link
                href="/wunschliste"
                className="flex h-10 w-full items-center justify-center text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Wunschliste öffnen →
              </Link>
            )}
          </div>

          <p className="mt-4 text-center text-[10px] text-[var(--muted)]">
            Preise zuletzt aktualisiert: heute, 06:00 Uhr
          </p>
        </div>
      </aside>
    </>
  );
}

function MiniPriceChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const w = 320;
  const h = 88;
  const pad = { t: 8, r: 8, b: 18, l: 28 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const min = Math.min(...data.map((d) => d.value)) * 0.96;
  const max = Math.max(...data.map((d) => d.value)) * 1.04;
  const span = Math.max(max - min, 0.01);
  const pts = data.map((d, i) => {
    const x = pad.l + (i / (data.length - 1)) * cw;
    const y = pad.t + ch - ((d.value - min) / span) * ch;
    return { x, y, ...d };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${pad.t + ch} L ${pts[0].x} ${pad.t + ch} Z`;
  const yTicks = [min, (min + max) / 2, max];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
      <defs>
        <linearGradient id="cardPriceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => {
        const y = pad.t + ch - ((v - min) / span) * ch;
        return (
          <g key={i}>
            <line
              x1={pad.l}
              y1={y}
              x2={w - pad.r}
              y2={y}
              stroke="var(--border)"
            />
            <text
              x={pad.l - 4}
              y={y + 3}
              textAnchor="end"
              className="fill-[var(--muted)] text-[8px]"
            >
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#cardPriceFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts
        .filter((_, i) => i === 0 || i === pts.length - 1 || i % 3 === 0)
        .map((p) => (
          <text
            key={p.label + p.x}
            x={p.x}
            y={h - 4}
            textAnchor="middle"
            className="fill-[var(--muted)] text-[8px]"
          >
            {p.label}
          </text>
        ))}
    </svg>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] ring-1 ring-[var(--border)]">
      {children}
    </span>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
