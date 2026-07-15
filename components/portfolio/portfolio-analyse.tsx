"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  portfolioAnalyseByAttribute,
  portfolioAnalyseMetrics,
  portfolioConcentration,
  portfolioReturnDistribution,
  portfolioReturnSeries,
  portfolioSetPerformance,
  portfolioWinLoss,
  type AnalyseAttributeRow,
  type ReturnSeriesPoint,
  type SetPerformanceRow,
} from "@/lib/mock-data";

type AnalyseRange = "30d" | "6m" | "1y" | "max";
type ReturnMode = "kumuliert" | "monatlich";
type SetMode = "top" | "flop";
type AttrDim = "language" | "condition" | "rarity";

const analyseRanges: { id: AnalyseRange; label: string }[] = [
  { id: "30d", label: "30 Tage" },
  { id: "6m", label: "6 Monate" },
  { id: "1y", label: "1 Jahr" },
  { id: "max", label: "Max" },
];

export function PortfolioAnalyse() {
  const [range, setRange] = useState<AnalyseRange>("1y");
  const [returnMode, setReturnMode] = useState<ReturnMode>("kumuliert");
  const [setMode, setSetMode] = useState<SetMode>("top");
  const [attrDim, setAttrDim] = useState<AttrDim>("language");
  const m = portfolioAnalyseMetrics;
  const wl = portfolioWinLoss;

  const setRows = useMemo(() => {
    const rows = [...portfolioSetPerformance];
    if (setMode === "top") {
      rows.sort((a, b) => b.returnPct - a.returnPct);
    } else {
      rows.sort((a, b) => a.returnPct - b.returnPct);
    }
    return rows;
  }, [setMode]);

  const attrRows = portfolioAnalyseByAttribute[attrDim];

  return (
    <div className="space-y-5">
      {/* Range selector (analyse-specific) */}
      <div className="flex justify-end">
        <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
          {analyseRanges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.id
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AnalyseMetric
          icon="trend"
          label="Rendite (1 Jahr)"
          value={formatPercent(m.return1y)}
          positive
        />
        <AnalyseMetric
          icon="pie"
          label="Gewinnerquote"
          value={`${m.winRate} %`}
          hint={`${m.winnersCount} von ${m.totalAssets} Assets`}
        />
        <AnalyseMetric
          icon="wave"
          label="Wertschwankung"
          value={`${m.volatility.toLocaleString("de-DE")} %`}
          warn
        />
        <AnalyseMetric
          icon="drop"
          label="Größter Rückgang"
          value={`${m.maxDrawdown.toLocaleString("de-DE")} %`}
          hint="innerhalb von 1 Jahr"
          negative
        />
      </div>

      {/* Secondary strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StripStat
          icon="★"
          label="Beste Asset-Klasse"
          value={`${m.bestAssetClass} +${m.bestAssetClassReturn.toLocaleString("de-DE")} %`}
          accent
        />
        <StripStat
          icon="🏆"
          label="Stärkstes Set"
          value={`${m.strongestSet} +${m.strongestSetReturn.toLocaleString("de-DE")} %`}
          accent
        />
        <StripStat
          icon="▍"
          label="Top-5-Anteil"
          value={`${m.top5Share} %`}
        />
        <StripStat
          icon="◆"
          label="Preisabdeckung"
          value={`${m.priceCoverage} %`}
        />
      </div>

      {/* Return chart + win/loss donut */}
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Rendite nach Asset-Typ</h2>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-pink-400" />
                  Karten
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded bg-violet-400" />
                  Sealed
                </span>
              </div>
            </div>
            <div className="flex rounded-full border border-[var(--border)] p-0.5">
              {(
                [
                  ["kumuliert", "Kumuliert"],
                  ["monatlich", "Monatlich"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setReturnMode(id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    returnMode === id
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ReturnChart data={portfolioReturnSeries} mode={returnMode} />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-medium">Gewinner &amp; Verlierer</h2>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <WinLossDonut
              plus={wl.inPlus}
              flat={wl.unchanged}
              minus={wl.inMinus}
            />
            <div className="w-full space-y-3 text-xs">
              <LegendRow color="#f472b6" label="Im Plus" value={`${wl.inPlus} %`} />
              <LegendRow color="#71717a" label="Unverändert" value={`${wl.unchanged} %`} />
              <LegendRow color="#f87171" label="Im Minus" value={`${wl.inMinus} %`} />
              <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3">
                <div>
                  <p className="mb-1.5 font-medium text-[var(--muted)]">Karten</p>
                  <p className="text-[var(--positive)]">
                    {wl.cards.plus} ({wl.cards.plusPct} %)
                  </p>
                  <p className="text-[var(--muted)]">
                    {wl.cards.flat} ({wl.cards.flatPct} %)
                  </p>
                  <p className="text-[var(--negative)]">
                    {wl.cards.minus} ({wl.cards.minusPct} %)
                  </p>
                </div>
                <div>
                  <p className="mb-1.5 font-medium text-[var(--muted)]">Sealed</p>
                  <p className="text-[var(--positive)]">
                    {wl.sealed.plus} ({wl.sealed.plusPct} %)
                  </p>
                  <p className="text-[var(--muted)]">
                    {wl.sealed.flat} ({wl.sealed.flatPct} %)
                  </p>
                  <p className="text-[var(--negative)]">
                    {wl.sealed.minus} ({wl.sealed.minusPct} %)
                  </p>
                </div>
              </div>
              <Link
                href="/portfolio/positionen"
                className="inline-block text-xs font-medium text-[var(--accent)] hover:opacity-80"
              >
                Positionen ansehen →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Set performance + concentration */}
      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Performance nach Set</h2>
            <div className="flex rounded-full border border-[var(--border)] p-0.5">
              <button
                type="button"
                onClick={() => setSetMode("top")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  setMode === "top"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setSetMode("flop")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  setMode === "flop"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                Flop
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Set</th>
                  <th className="pb-2 font-medium">Asset-Typ</th>
                  <th className="pb-2 text-right font-medium">Marktwert</th>
                  <th className="pb-2 text-right font-medium">Gewinn / Verlust</th>
                  <th className="pb-2 text-right font-medium">Rendite</th>
                  <th className="pb-2 pl-3 font-medium">Anteil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {setRows.map((row, i) => (
                  <SetRow key={row.id} row={row} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-medium">Portfolio-Konzentration</h2>
          <div className="space-y-3">
            <ConcBar label="Top 5 Positionen" pct={portfolioConcentration.top5} />
            <ConcBar label="Top 10 Positionen" pct={portfolioConcentration.top10} />
            <ConcBar label="Restliches Portfolio" pct={portfolioConcentration.rest} muted />
          </div>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/40 px-3 py-3">
            <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
              {portfolioConcentration.label}
            </span>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {portfolioConcentration.note}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                ★ Größte Position
              </p>
              <p className="tabular-nums mt-0.5 text-sm font-semibold">
                {portfolioConcentration.largestShare.toLocaleString("de-DE")} %
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Verschiedene Assets
              </p>
              <p className="tabular-nums mt-0.5 text-sm font-semibold">
                {portfolioConcentration.distinctAssets}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--border)] pt-3 text-xs font-medium">
            <Link
              href="/portfolio/positionen"
              className="text-[var(--accent)] hover:opacity-80"
            >
              Positionen →
            </Link>
            <Link
              href="/portfolio/top-performer"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Top Performer →
            </Link>
            <Link
              href="/portfolio/top-verlierer"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Top Verlierer →
            </Link>
          </div>
        </div>
      </div>

      {/* Distribution + attribute analysis */}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Renditeverteilung</h2>
            <p className="text-xs text-[var(--muted)]">
              Basis: {m.totalAssets} bewertete Assets
            </p>
          </div>
          <ReturnDistributionChart data={portfolioReturnDistribution} />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Analyse nach Merkmal</h2>
            <div className="flex rounded-full border border-[var(--border)] p-0.5">
              {(
                [
                  ["language", "Sprache"],
                  ["condition", "Zustand"],
                  ["rarity", "Seltenheit"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAttrDim(id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    attrDim === id
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  <th className="pb-2 text-left font-medium">Merkmal</th>
                  <th className="pb-2 text-right font-medium">Marktwert</th>
                  <th className="pb-2 text-right font-medium">Rendite</th>
                  <th className="pb-2 pl-3 text-left font-medium">Portfolio-Anteil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {attrRows.map((row) => (
                  <AttrRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Subcomponents ─────────────────────────────────────── */

function AnalyseMetric({
  icon,
  label,
  value,
  hint,
  positive,
  negative,
  warn,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
  negative?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          negative
            ? "bg-[var(--negative-soft)] text-[var(--negative)]"
            : warn
              ? "bg-pink-500/10 text-pink-300"
              : "bg-[var(--accent-soft)] text-[var(--accent)]"
        }`}
      >
        <AIcon type={icon} />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px]" aria-hidden>
            i
          </span>
        </p>
        <p
          className={`tabular-nums mt-0.5 text-lg font-semibold tracking-tight ${
            positive
              ? "text-[var(--positive)]"
              : negative
                ? "text-[var(--negative)]"
                : warn
                  ? "text-pink-300"
                  : ""
          }`}
        >
          {value}
        </p>
        {hint && (
          <p className="text-xs text-[var(--muted)]">{hint}</p>
        )}
      </div>
    </div>
  );
}

function StripStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
        <span className="mr-1 opacity-70">{icon}</span>
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${
          accent ? "text-[var(--accent)]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ReturnChart({
  data,
  mode,
}: {
  data: ReturnSeriesPoint[];
  mode: ReturnMode;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 720;
  const height = 240;
  const pad = { top: 16, right: 48, bottom: 32, left: 40 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const series = useMemo(() => {
    if (mode === "kumuliert") return data;
    // monthly delta approximation
    return data.map((d, i) => {
      if (i === 0) return { ...d, cards: d.cards, sealed: d.sealed };
      const prev = data[i - 1];
      return {
        ...d,
        cards: d.cards - prev.cards,
        sealed: d.sealed - prev.sealed,
      };
    });
  }, [data, mode]);

  const vals = series.flatMap((d) => [d.cards, d.sealed]);
  const min = Math.min(...vals, 0) - 2;
  const max = Math.max(...vals) + 4;
  const span = Math.max(max - min, 1);

  const mapped = series.map((d, i) => {
    const x = pad.left + (i / (series.length - 1)) * cw;
    const yC = pad.top + ch - ((d.cards - min) / span) * ch;
    const yS = pad.top + ch - ((d.sealed - min) / span) * ch;
    return { ...d, x, yC, yS };
  });

  const pathC = mapped.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yC}`).join(" ");
  const pathS = mapped.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yS}`).join(" ");
  const zeroY = pad.top + ch - ((0 - min) / span) * ch;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let dist = Infinity;
    mapped.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setHover(best);
  }

  const h = hover != null ? mapped[hover] : null;
  const last = mapped[mapped.length - 1];

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full cursor-crosshair"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = pad.top + ch * r;
          const val = max - span * r;
          return (
            <g key={r}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--border)" />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-[var(--muted)] text-[10px]">
                {Math.round(val)} %
              </text>
            </g>
          );
        })}
        <line
          x1={pad.left}
          y1={zeroY}
          x2={width - pad.right}
          y2={zeroY}
          stroke="#71717a"
          strokeDasharray="4 4"
        />
        <path d={pathS} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
        <path d={pathC} fill="none" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
        {mapped.map((p, i) =>
          i % 2 === 0 || i === mapped.length - 1 ? (
            <text key={p.date} x={p.x} y={height - 8} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">
              {p.label}
            </text>
          ) : null,
        )}
        {h && (
          <g>
            <line x1={h.x} y1={pad.top} x2={h.x} y2={pad.top + ch} stroke="var(--border-strong)" strokeDasharray="3 3" />
            <circle cx={h.x} cy={h.yC} r="5" fill="var(--background)" stroke="#f472b6" strokeWidth="2.5" />
            <circle cx={h.x} cy={h.yS} r="5" fill="var(--background)" stroke="#a78bfa" strokeWidth="2.5" />
          </g>
        )}
        {/* end labels */}
        <text x={last.x + 6} y={last.yC + 4} className="fill-pink-300 text-[10px] font-medium">
          +{last.cards.toLocaleString("de-DE")} %
        </text>
        <text x={last.x + 6} y={last.yS + 4} className="fill-violet-300 text-[10px] font-medium">
          +{last.sealed.toLocaleString("de-DE")} %
        </text>
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute z-10 min-w-[10rem] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-3 py-2 text-xs shadow-lg"
          style={{
            left: `clamp(0.5rem, ${(h.x / width) * 100}% - 5rem, calc(100% - 11rem))`,
            top: 8,
          }}
        >
          <p className="font-medium">
            {new Date(h.date + "T12:00:00").toLocaleDateString("de-DE", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            })}
          </p>
          <div className="mt-1.5 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-pink-300">Karten</span>
              <span className="tabular-nums font-medium">
                +{h.cards.toLocaleString("de-DE")} %
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-violet-300">Sealed</span>
              <span className="tabular-nums font-medium">
                +{h.sealed.toLocaleString("de-DE")} %
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-1">
              <span className="text-[var(--muted)]">Differenz</span>
              <span className="tabular-nums font-medium text-[var(--positive)]">
                +{(h.cards - h.sealed).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WinLossDonut({
  plus,
  flat,
  minus,
}: {
  plus: number;
  flat: number;
  minus: number;
}) {
  const size = 140;
  const c = size / 2;
  const r = 48;
  const inner = 32;
  const segs = [
    { pct: plus, color: "#f472b6" },
    { pct: flat, color: "#52525b" },
    { pct: minus, color: "#f87171" },
  ];
  let cum = 0;
  const arcs = segs.map((s) => {
    const start = (cum / 100) * 360 - 90;
    cum += s.pct;
    const end = (cum / 100) * 360 - 90;
    const large = s.pct > 50 ? 1 : 0;
    const p = (ang: number, rad: number) => {
      const rads = (ang * Math.PI) / 180;
      return { x: c + rad * Math.cos(rads), y: c + rad * Math.sin(rads) };
    };
    const o0 = p(start, r);
    const o1 = p(end, r);
    const i0 = p(end, inner);
    const i1 = p(start, inner);
    const d = [
      `M ${o0.x} ${o0.y}`,
      `A ${r} ${r} 0 ${large} 1 ${o1.x} ${o1.y}`,
      `L ${i0.x} ${i0.y}`,
      `A ${inner} ${inner} 0 ${large} 0 ${i1.x} ${i1.y}`,
      "Z",
    ].join(" ");
    return { ...s, d };
  });

  return (
    <div className="relative shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] text-[var(--muted)]">Im Plus</p>
        <p className="text-lg font-semibold text-pink-300">{plus} %</p>
      </div>
    </div>
  );
}

function SetRow({ row, rank }: { row: SetPerformanceRow; rank: number }) {
  const pos = row.profit >= 0;
  const dest =
    row.assetType === "Sealed" ? "/assets/sealed" : "/portfolio/positionen";
  return (
    <tr className="group">
      <td className="tabular-nums py-2.5 text-[var(--muted)]">{rank}</td>
      <td className="py-2.5">
        <Link href={dest} className="flex items-center gap-2 hover:opacity-90">
          <span
            className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-white/10"
            style={{
              background: `linear-gradient(135deg, ${row.color}55, #18181b)`,
            }}
          />
          <span className="font-medium group-hover:text-[var(--accent)]">
            {row.name}
          </span>
        </Link>
      </td>
      <td className="py-2.5">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
            row.assetType === "Karten"
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : row.assetType === "Sealed"
                ? "bg-amber-500/15 text-amber-300"
                : "bg-violet-500/15 text-violet-300"
          }`}
        >
          {row.assetType}
        </span>
      </td>
      <td className="tabular-nums py-2.5 text-right">
        {formatCurrency(row.market)}
      </td>
      <td
        className={`tabular-nums py-2.5 text-right ${
          pos ? "text-[var(--positive)]" : "text-[var(--negative)]"
        }`}
      >
        {pos ? "+" : ""}
        {formatCurrency(row.profit)}
      </td>
      <td
        className={`tabular-nums py-2.5 text-right font-medium ${
          pos ? "text-[var(--positive)]" : "text-[var(--negative)]"
        }`}
      >
        {pos ? "+" : ""}
        {row.returnPct.toLocaleString("de-DE")} %
      </td>
      <td className="py-2.5 pl-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${row.sharePct}%` }}
            />
          </div>
          <span className="tabular-nums text-xs text-[var(--muted)]">
            {row.sharePct} %
          </span>
        </div>
      </td>
    </tr>
  );
}

function ConcBar({
  label,
  pct,
  muted,
}: {
  label: string;
  pct: number;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="tabular-nums font-medium">{pct} %</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className={`h-full rounded-full ${
            muted ? "bg-zinc-500" : "bg-[var(--accent)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ReturnDistributionChart({
  data,
}: {
  data: { label: string; pct: number; color: string }[];
}) {
  const max = Math.max(...data.map((d) => d.pct)) * 1.15;
  return (
    <div className="mt-4">
      <div className="flex h-40 items-end gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="tabular-nums text-[11px] font-medium text-[var(--muted)]">
              {d.pct} %
            </span>
            <div
              className="w-full max-w-[3rem] rounded-t-md"
              style={{
                height: `${(d.pct / max) * 120}px`,
                backgroundColor: d.color,
              }}
            />
            <span className="text-center text-[9px] leading-tight text-[var(--muted)] sm:text-[10px]">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttrRow({ row }: { row: AnalyseAttributeRow }) {
  return (
    <tr>
      <td className="py-2.5">
        <span className="inline-flex items-center gap-2">
          {row.flag && <span aria-hidden>{row.flag}</span>}
          {row.label}
        </span>
      </td>
      <td className="tabular-nums py-2.5 text-right">
        {formatCurrency(row.market)}
      </td>
      <td className="tabular-nums py-2.5 text-right text-[var(--positive)]">
        +{row.returnPct.toLocaleString("de-DE")} %
      </td>
      <td className="py-2.5 pl-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${row.sharePct}%` }}
            />
          </div>
          <span className="tabular-nums w-8 text-right text-xs text-[var(--muted)]">
            {row.sharePct} %
          </span>
        </div>
      </td>
    </tr>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-[var(--muted)]">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}

function AIcon({ type }: { type: string }) {
  const p = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
  } as const;
  switch (type) {
    case "trend":
      return (
        <svg {...p}>
          <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" />
          <path d="M15 5h5v5" strokeLinecap="round" />
        </svg>
      );
    case "pie":
      return (
        <svg {...p}>
          <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
          <path d="M13.5 3.2A9 9 0 0 1 20.8 10.5H13.5V3.2Z" />
        </svg>
      );
    case "wave":
      return (
        <svg {...p}>
          <path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" strokeLinecap="round" />
        </svg>
      );
    case "drop":
      return (
        <svg {...p}>
          <path d="M4 10l8 8 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 6h4v4" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
