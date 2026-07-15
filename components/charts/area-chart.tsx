"use client";

import { useState } from "react";

type DataPoint = { label: string; value: number };

type AreaChartProps = {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  currentLabel?: string;
  height?: number;
  showRangeTabs?: boolean;
};

const ranges = ["1W", "1M", "3M", "6M", "1J", "MAX"];

export function AreaChart({
  data,
  title,
  subtitle,
  currentLabel,
  height = 260,
  showRangeTabs = true,
}: AreaChartProps) {
  const [range, setRange] = useState("1M");
  const width = 800;
  const padding = { top: 20, right: 20, bottom: 36, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.92;
  const max = Math.max(...values) * 1.04;

  const points = data.map((point, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y =
      padding.top +
      chartHeight -
      ((point.value - min) / (max - min)) * chartHeight;
    return { ...point, x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    padding.top + chartHeight
  } L ${points[0].x} ${padding.top + chartHeight} Z`;

  const last = data[data.length - 1];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      {(title || showRangeTabs) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-medium">{title}</h2>}
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>
            )}
          </div>
          {showRangeTabs && (
            <div className="flex gap-1 rounded-lg border border-[var(--border)] p-0.5">
              {ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
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

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.33, 0.66, 1].map((ratio) => {
          const y = padding.top + chartHeight * ratio;
          const val = max - (max - min) * ratio;
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
                {Math.round(val / 1000)}k €
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#areaFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {points.map((p) => (
          <text
            key={p.label}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-[var(--muted)] text-[10px]"
          >
            {p.label}
          </text>
        ))}

        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="5"
          fill="var(--background)"
          stroke="var(--accent)"
          strokeWidth="2"
        />
      </svg>

      {currentLabel && (
        <div className="mt-2 flex justify-end">
          <div className="text-right">
            <p className="tabular-nums text-sm font-medium">
              {last.value.toLocaleString("de-DE")} €*
            </p>
            <p className="text-xs text-[var(--muted)]">{currentLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}