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
  /** Tooltip text for the info icon */
  infoText?: string;
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
  infoText,
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

  const tip =
    infoText ??
    (label === "Gesamtwert"
      ? "Aktueller Marktwert aller Karten und Sealed-Produkte in deiner Sammlung."
      : label === "Investiert"
        ? "Summe aller Einkaufspreise (EK) deiner Positionen."
        : label.includes("Gewinn")
          ? "Marktwert minus investiertes Kapital (unrealisiert + realisiert, Demo)."
          : label === "Rendite"
            ? "Prozentuale Entwicklung: (Marktwert − Investiert) ÷ Investiert."
            : "Weitere Informationen zu dieser Kennzahl.");

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 ${className}`}
    >
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--muted)]">
        {label}
        {info && <InfoTip text={tip} />}
      </p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`tabular-nums text-lg font-medium tracking-tight sm:text-xl ${valueColor}`}
          >
            {value}
          </p>
          {hint && (
            <p className={`tabular-nums mt-1 text-xs ${hintColor}`}>{hint}</p>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <MiniSparkline
            values={sparkline}
            positive={positive}
            negative={negative}
          />
        )}
      </div>
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex">
      <span
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px] text-[var(--muted)] transition-colors group-hover/tip:border-[var(--accent)] group-hover/tip:text-[var(--accent)]"
        tabIndex={0}
        aria-label={text}
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-52 -translate-x-1/2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-2.5 py-2 text-[11px] font-normal normal-case tracking-normal text-[var(--foreground)] opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
        <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-[var(--border-strong)]" />
      </span>
    </span>
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
  const w = 72;
  const h = 32;
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

  // Area under line
  const area = `${pts} L ${w},${h} L 0,${h} Z`;

  const stroke = positive
    ? "var(--positive)"
    : negative
      ? "var(--negative)"
      : "var(--accent)";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="mb-0.5 shrink-0 opacity-90"
      aria-hidden
    >
      <path d={area} fill={stroke} opacity="0.12" />
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
