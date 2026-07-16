"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { HistoryPoint } from "@/lib/mock-data";

type LegacyPoint = { label: string; value: number };

type AreaChartProps = {
  /** Preferred: daily points with date + series */
  dailyData?: HistoryPoint[];
  /** Fallback legacy series */
  data?: LegacyPoint[];
  title?: string;
  subtitle?: string;
  currentLabel?: string;
  /** Minimum chart body height (px) */
  minHeight?: number;
  showRangeTabs?: boolean;
  showSeriesLegend?: boolean;
  footerNote?: string;
  /**
   * External scope from Dashboard/Portfolio header.
   * Syncs which curve is active: gesamt | karten | sealed.
   */
  seriesFocus?: "gesamt" | "karten" | "sealed";
};

const ranges = ["1W", "1M", "3M", "6M", "1J", "MAX"] as const;
type Range = (typeof ranges)[number];

const rangeDays: Record<Range, number | null> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1J": 365,
  MAX: null,
};

type SeriesKey = "value" | "cards" | "sealed";

const seriesMeta: {
  key: SeriesKey;
  label: string;
  color: string;
  dashed?: boolean;
}[] = [
  { key: "value", label: "Gesamt", color: "var(--accent)" },
  { key: "cards", label: "Karten", color: "#f472b6" },
  { key: "sealed", label: "Sealed", color: "#a78bfa", dashed: true },
];

function toPoints(dailyData?: HistoryPoint[], data?: LegacyPoint[]): HistoryPoint[] {
  if (dailyData?.length) return dailyData;
  return (data ?? []).map((d, i) => ({
    date: `legacy-${i}`,
    label: d.label,
    value: d.value,
    cards: Math.round(d.value * 0.72),
    sealed: Math.round(d.value * 0.28),
  }));
}

/** Filter by calendar days from the last data point (not array length). */
export function filterHistoryByRange<T extends { date: string }>(
  points: T[],
  range: Range,
): T[] {
  if (!points.length) return points;
  const days = rangeDays[range];
  if (days == null) return points;

  const last = points[points.length - 1];
  // legacy-* dates: fall back to array slice
  if (last.date.startsWith("legacy")) {
    return points.length <= days ? points : points.slice(-days);
  }

  const end = new Date(`${last.date}T12:00:00`);
  if (Number.isNaN(end.getTime())) {
    return points.length <= days ? points : points.slice(-days);
  }
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const startIso = start.toISOString().slice(0, 10);
  const filtered = points.filter((p) => p.date >= startIso);
  return filtered.length > 0 ? filtered : points.slice(-1);
}

/** Downsample for smooth SVG paths on long ranges (keep first/last + even steps). */
function downsample<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const out: T[] = [];
  const last = points.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / (maxPoints - 1)) * last);
    if (out.length === 0 || out[out.length - 1] !== points[idx]) {
      out.push(points[idx]);
    }
  }
  if (out[out.length - 1] !== points[last]) out.push(points[last]);
  return out;
}

function seriesFromFocus(
  focus?: "gesamt" | "karten" | "sealed",
): Record<SeriesKey, boolean> {
  if (focus === "karten") return { value: false, cards: true, sealed: false };
  if (focus === "sealed") return { value: false, cards: false, sealed: true };
  return { value: true, cards: false, sealed: false };
}

export function AreaChart({
  dailyData,
  data,
  title,
  subtitle,
  currentLabel,
  minHeight = 260,
  showRangeTabs = true,
  showSeriesLegend = true,
  footerNote,
  seriesFocus,
}: AreaChartProps) {
  const [range, setRange] = useState<Range>("1M");
  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>(
    () => seriesFromFocus(seriesFocus),
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartBodyRef = useRef<HTMLDivElement>(null);
  const [bodySize, setBodySize] = useState({ w: 800, h: minHeight });

  // Keep chart curves in sync with header Gesamt / Karten / Sealed
  useEffect(() => {
    if (!seriesFocus) return;
    setActiveSeries(seriesFromFocus(seriesFocus));
    setHoverIndex(null);
  }, [seriesFocus]);

  const allPoints = useMemo(() => toPoints(dailyData, data), [dailyData, data]);
  const points = useMemo(() => {
    const filtered = filterHistoryByRange(allPoints, range);
    // denser for short ranges, cap for long
    const maxPts =
      range === "1W" ? 60 : range === "1M" ? 90 : range === "3M" ? 120 : 160;
    return downsample(filtered, maxPts);
  }, [allPoints, range]);

  // Fill available height — no empty gap under the graph when the card stretches
  useEffect(() => {
    const el = chartBodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setBodySize({
        w: Math.max(280, Math.round(width)),
        h: Math.max(minHeight, Math.round(height)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minHeight]);

  const width = bodySize.w;
  const height = bodySize.h;
  const padding = { top: 16, right: 16, bottom: 32, left: 48 };
  const chartWidth = Math.max(1, width - padding.left - padding.right);
  const chartHeight = Math.max(1, height - padding.top - padding.bottom);

  const activeKeys = seriesMeta
    .filter((s) => activeSeries[s.key])
    .map((s) => s.key);
  const seriesValues = points.flatMap((p) => activeKeys.map((k) => p[k]));
  const min = seriesValues.length
    ? Math.min(...seriesValues) * 0.94
    : 0;
  const max = seriesValues.length
    ? Math.max(...seriesValues) * 1.03
    : 1;
  const span = Math.max(max - min, 1);

  const mapped = points.map((point, index) => {
    const x =
      points.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (index / (points.length - 1)) * chartWidth;
    const ys: Record<SeriesKey, number> = {
      value:
        padding.top + chartHeight - ((point.value - min) / span) * chartHeight,
      cards:
        padding.top + chartHeight - ((point.cards - min) / span) * chartHeight,
      sealed:
        padding.top +
        chartHeight -
        ((point.sealed - min) / span) * chartHeight,
    };
    return { ...point, x, ys };
  });

  function pathFor(key: SeriesKey) {
    return mapped
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.ys[key]}`)
      .join(" ");
  }

  function areaFor(key: SeriesKey) {
    const line = pathFor(key);
    if (!mapped.length) return "";
    return `${line} L ${mapped[mapped.length - 1].x} ${
      padding.top + chartHeight
    } L ${mapped[0].x} ${padding.top + chartHeight} Z`;
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || mapped.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestDist = Infinity;
    mapped.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHoverIndex(best);
  }

  const hover = hoverIndex != null ? mapped[hoverIndex] : null;
  const primaryKey: SeriesKey = activeSeries.value
    ? "value"
    : activeSeries.cards
      ? "cards"
      : "sealed";

  const labelCount =
    range === "1W" ? 7 : range === "1M" ? 6 : range === "1J" ? 6 : 5;
  const labelStep = Math.max(1, Math.ceil(mapped.length / labelCount));

  return (
    <div className="flex h-full min-h-[22rem] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      {(title || showRangeTabs) && (
        <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-medium">{title}</h2>}
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>
            )}
          </div>
          {showRangeTabs && (
            <div className="flex gap-0.5 rounded-lg border border-[var(--border)] p-0.5">
              {ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRange(r);
                    setHoverIndex(null);
                  }}
                  className={`rounded-md px-2 py-1 text-[11px] transition-colors sm:px-2.5 ${
                    range === r
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showSeriesLegend && (
        <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-[var(--muted)]">
              Anzeigen:
            </span>
            {seriesMeta.map((s) => {
              const on = activeSeries[s.key];
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    setActiveSeries((prev) => {
                      const next = { ...prev, [s.key]: !prev[s.key] };
                      if (!next.value && !next.cards && !next.sealed) {
                        return prev;
                      }
                      return next;
                    })
                  }
                  aria-pressed={on}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    on
                      ? "border-transparent text-white shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                  }`}
                  style={on ? { backgroundColor: s.color } : undefined}
                >
                  <span
                    className={`h-2 w-2 rounded-full ring-2 ring-white/30 ${
                      on ? "bg-white" : ""
                    }`}
                    style={on ? undefined : { backgroundColor: s.color }}
                  />
                  {s.label}
                  <span
                    className={`text-[10px] ${
                      on ? "text-white/80" : "text-[var(--muted)]"
                    }`}
                  >
                    {on ? "an" : "aus"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--muted)]">
            Tippe auf Karten / Sealed, um die Kurven ein- oder auszublenden
          </p>
        </div>
      )}

      {/* Chart body grows to fill card — no empty strip under the graph */}
      <div
        ref={chartBodyRef}
        className="relative min-h-[16rem] w-full flex-1"
        style={{ minHeight }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
          role="img"
          aria-label="Wertentwicklung"
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight * ratio;
            const val = max - span * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border)"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[var(--muted)] text-[10px]"
                >
                  {val >= 1000
                    ? `${(val / 1000).toLocaleString("de-DE", {
                        maximumFractionDigits: 0,
                      })}k €`
                    : `${Math.round(val)} €`}
                </text>
              </g>
            );
          })}

          {activeSeries.value && mapped.length > 0 && (
            <>
              <path d={areaFor("value")} fill="url(#areaFill)" />
              <path
                d={pathFor("value")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
          {activeSeries.cards && mapped.length > 0 && (
            <path
              d={pathFor("cards")}
              fill="none"
              stroke="#f472b6"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {activeSeries.sealed && mapped.length > 0 && (
            <path
              d={pathFor("sealed")}
              fill="none"
              stroke="#a78bfa"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {mapped.map((p, i) =>
            i % labelStep === 0 || i === mapped.length - 1 ? (
              <text
                key={`${p.date}-${i}`}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-[var(--muted)] text-[10px]"
              >
                {p.label}
              </text>
            ) : null,
          )}

          {hover && (
            <g>
              <line
                x1={hover.x}
                y1={padding.top}
                x2={hover.x}
                y2={padding.top + chartHeight}
                stroke="var(--border-strong)"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={hover.x}
                cy={hover.ys[primaryKey]}
                r="6"
                fill="var(--background)"
                stroke="var(--accent)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          {!hover && mapped.length > 0 && activeSeries.value && (
            <circle
              cx={mapped[mapped.length - 1].x}
              cy={mapped[mapped.length - 1].ys.value}
              r="5"
              fill="var(--background)"
              stroke="var(--accent)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 min-w-[9.5rem] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-3 py-2 shadow-lg"
            style={{
              left: `clamp(0.5rem, ${(hover.x / width) * 100}% - 4.75rem, calc(100% - 10rem))`,
              top: 8,
            }}
          >
            <p className="text-[11px] font-medium text-[var(--foreground)]">
              {hover.date.startsWith("legacy")
                ? hover.label
                : new Date(hover.date + "T12:00:00").toLocaleDateString(
                    "de-DE",
                    {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    },
                  )}
            </p>
            <div className="mt-1.5 space-y-1">
              {seriesMeta
                .filter((s) => activeSeries[s.key])
                .map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between gap-4 text-[11px]"
                  >
                    <span className="flex items-center gap-1.5 text-[var(--muted)]">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.label}
                    </span>
                    <span className="tabular-nums font-medium">
                      {formatCurrency(hover[s.key])}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {(footerNote || currentLabel) && (
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          {footerNote ? (
            <p className="flex items-center gap-1.5">
              <span aria-hidden>⏱</span>
              {footerNote}
            </p>
          ) : (
            <span />
          )}
          {currentLabel && !hover && (
            <p className="text-right text-[var(--muted)]">{currentLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
