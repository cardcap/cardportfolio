"use client";

import { useMemo, useRef, useState } from "react";
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
  height?: number;
  showRangeTabs?: boolean;
  showSeriesLegend?: boolean;
  footerNote?: string;
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
  { key: "cards", label: "Karten", color: "#a1a1aa" },
  { key: "sealed", label: "Sealed", color: "#71717a", dashed: true },
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

function filterByRange(points: HistoryPoint[], range: Range): HistoryPoint[] {
  const days = rangeDays[range];
  if (days == null || points.length <= days) return points;
  return points.slice(-days);
}

export function AreaChart({
  dailyData,
  data,
  title,
  subtitle,
  currentLabel,
  height = 280,
  showRangeTabs = true,
  showSeriesLegend = true,
  footerNote,
}: AreaChartProps) {
  const [range, setRange] = useState<Range>("1M");
  const [activeSeries, setActiveSeries] = useState<Record<SeriesKey, boolean>>({
    value: true,
    cards: false,
    sealed: false,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allPoints = useMemo(() => toPoints(dailyData, data), [dailyData, data]);
  const points = useMemo(
    () => filterByRange(allPoints, range),
    [allPoints, range],
  );

  const width = 800;
  const padding = { top: 20, right: 24, bottom: 36, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const activeKeys = seriesMeta.filter((s) => activeSeries[s.key]).map((s) => s.key);
  const seriesValues = points.flatMap((p) =>
    activeKeys.map((k) => p[k]),
  );
  const min = Math.min(...seriesValues) * 0.94;
  const max = Math.max(...seriesValues) * 1.03;
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

  // Axis label sampling
  const labelStep = Math.max(1, Math.ceil(mapped.length / 6));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      {(title || showRangeTabs) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
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
        <div className="mb-3 flex flex-wrap items-center gap-4">
          {seriesMeta.map((s) => {
            const on = activeSeries[s.key];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() =>
                  setActiveSeries((prev) => {
                    const next = { ...prev, [s.key]: !prev[s.key] };
                    // keep at least one active
                    if (!next.value && !next.cards && !next.sealed) {
                      return prev;
                    }
                    return next;
                  })
                }
                className={`flex items-center gap-2 text-xs transition-opacity ${
                  on ? "opacity-100" : "opacity-40"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: on ? s.color : "var(--muted)",
                    boxShadow: s.dashed ? "inset 0 0 0 1px currentColor" : undefined,
                  }}
                />
                <span className={on ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full cursor-crosshair touch-none"
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

          {activeSeries.value && (
            <>
              <path d={areaFor("value")} fill="url(#areaFill)" />
              <path
                d={pathFor("value")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
          {activeSeries.cards && (
            <path
              d={pathFor("cards")}
              fill="none"
              stroke="#a1a1aa"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          {activeSeries.sealed && (
            <path
              d={pathFor("sealed")}
              fill="none"
              stroke="#71717a"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          )}

          {mapped.map((p, i) =>
            i % labelStep === 0 || i === mapped.length - 1 ? (
              <text
                key={p.date}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className="fill-[var(--muted)] text-[10px]"
              >
                {p.label}
              </text>
            ) : null,
          )}

          {/* hover guide + point */}
          {hover && (
            <g>
              <line
                x1={hover.x}
                y1={padding.top}
                x2={hover.x}
                y2={padding.top + chartHeight}
                stroke="var(--border-strong)"
                strokeDasharray="3 3"
              />
              <circle
                cx={hover.x}
                cy={hover.ys[primaryKey]}
                r="6"
                fill="var(--background)"
                stroke="var(--accent)"
                strokeWidth="2.5"
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
                : new Date(hover.date + "T12:00:00").toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
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
