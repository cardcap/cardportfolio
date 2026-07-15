"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CardImage } from "@/components/ui/card-image";
import { formatCurrency, formatDateDE } from "@/lib/format";
import {
  getCardImageFallbacks,
  getCardImageUrl,
  getCardPrice,
  type TcgCard,
} from "@/lib/pokemon-tcg";
import { formatRarityEnglish } from "@/lib/rarity-labels";
import type { SetDetail } from "@/lib/set-stats";

type PriceRange = "7T" | "30T" | "1J";

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
  onEditCollection?: () => void;
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
}: SetCardDetailPanelProps) {
  const [priceRange, setPriceRange] = useState<PriceRange>("30T");
  const price = getCardPrice(card) ?? 0;
  const hasPrice = getCardPrice(card) != null;

  // Demo cost basis when owned
  const purchasePrice = qty > 0 ? Math.round(price * 0.73 * 100) / 100 : 0;
  const profit = qty > 0 && hasPrice ? Math.round((price - purchasePrice) * 100) / 100 : 0;
  const change30 = hasPrice ? 5.3 : 0;

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

  return (
    <>
      <button
        type="button"
        aria-label="Detailansicht schließen"
        className="fixed inset-0 z-40 bg-black/40 lg:bg-black/25"
        onClick={onClose}
      />
      <aside className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 flex max-h-[min(88dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:inset-x-auto lg:inset-y-4 lg:left-auto lg:right-4 lg:bottom-4 lg:top-4 lg:w-[min(100vw-2rem,26rem)] lg:max-h-none lg:rounded-2xl">
        {/* Header nav */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)] disabled:opacity-30"
              aria-label="Vorherige Karte"
            >
              ‹
            </button>
            <span className="tabular-nums min-w-[4.5rem] text-center text-xs font-medium text-[var(--muted)]">
              {positionLabel}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)] disabled:opacity-30"
              aria-label="Nächste Karte"
            >
              ›
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          >
            ×
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
                <Badge>DE</Badge>
                {typeLabel && <Badge>{typeLabel}</Badge>}
                {rarityLabel && <Badge>{rarityLabel}</Badge>}
              </div>

              <div className="mt-4">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">
                  Aktueller Marktwert
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px]">
                    i
                  </span>
                </p>
                <p className="tabular-nums mt-0.5 text-2xl font-semibold tracking-tight">
                  {hasPrice ? formatCurrency(price) : "—"}
                </p>
                {hasPrice && (
                  <p className="tabular-nums text-xs text-[var(--positive)]">
                    +{change30.toLocaleString("de-DE")} % (30 Tage)
                  </p>
                )}
              </div>
            </div>
            <div className="mx-auto w-[min(100%,11.5rem)] shrink-0 order-1 sm:order-2 sm:mx-0 sm:w-[48%]">
              <CardImage
                src={getCardImageUrl(card)}
                alt={card.name}
                fallbacks={getCardImageFallbacks(card)}
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
              <DataRow label="Sprache" value="Deutsch" />
              <DataRow label="Seltenheit" value={rarityLabel ?? "—"} />
              <DataRow
                label="Erscheinungsdatum"
                value={
                  setDetail.releaseDate
                    ? formatDateDE(setDetail.releaseDate)
                    : "—"
                }
              />
              <DataRow
                label="Kategorie"
                value={card.category ?? typeLabel ?? "Pokémon"}
              />
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
                    <p className="mt-0.5 font-medium">NM</p>
                  </div>
                  <div className="rounded-lg bg-[var(--surface)] px-2 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      EK
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
                        profit >= 0
                          ? "text-[var(--positive)]"
                          : "text-[var(--negative)]"
                      }`}
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatCurrency(profit)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/assets/karten"
                  className="mt-3 inline-block text-xs font-medium text-[var(--accent)] hover:opacity-80"
                >
                  Sammlungsdetails ansehen →
                </Link>
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
              onClick={onEditCollection}
              className="flex h-11 w-full items-center justify-center rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110"
            >
              {qty > 0 ? "Sammlung bearbeiten" : "Zur Sammlung hinzufügen"}
            </button>
            <button
              type="button"
              onClick={onAddToWishlist}
              className="flex h-11 w-full items-center justify-center rounded-full border border-[var(--accent)]/40 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              Zur Wunschliste hinzufügen
            </button>
            <Link
              href="/wunschliste"
              className="flex h-10 w-full items-center justify-center text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Wunschliste öffnen →
            </Link>
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
