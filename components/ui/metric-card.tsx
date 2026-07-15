type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
  /** Optional sparkline values */
  sparkline?: number[];
  /** Show info affordance next to label */
  info?: boolean;
  className?: string;
};

export function MetricCard({
  label,
  value,
  hint,
  accent,
  positive,
  negative,
  sparkline,
  info,
  className = "",
}: MetricCardProps) {
  const valueColor = accent
    ? "text-[var(--accent)]"
    : positive
      ? "text-[var(--positive)]"
      : negative
        ? "text-[var(--negative)]"
        : "";

  const hintColor = positive
    ? "text-[var(--positive)]"
    : negative
      ? "text-[var(--negative)]"
      : "text-[var(--muted)]";

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-[var(--muted)]">
          {label}
          {info && (
            <span
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px] text-[var(--muted)]"
              title="Info"
              aria-hidden
            >
              i
            </span>
          )}
        </p>
        {sparkline && sparkline.length > 1 && (
          <MiniSparkline values={sparkline} positive={positive} negative={negative} />
        )}
      </div>
      <p
        className={`tabular-nums mt-1.5 text-lg font-medium tracking-tight sm:text-xl ${valueColor}`}
      >
        {value}
      </p>
      {hint && (
        <p className={`tabular-nums mt-1 text-xs ${hintColor}`}>{hint}</p>
      )}
    </div>
  );
}

function MiniSparkline({
  values,
  positive,
  negative,
}: {
  values: number[];
  positive?: boolean;
  negative?: boolean;
}) {
  const w = 64;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = positive
    ? "var(--accent)"
    : negative
      ? "var(--negative)"
      : "var(--accent)";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-90" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
