import { formatCurrency } from "@/lib/format";

type MetricCardProps = {
  label: string;
  value: string;
  /** @deprecated use changeAbs / changePct / periodNote */
  hint?: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
  /** Optional sparkline values (no axis labels) */
  sparkline?: number[];
  /** "area" soft fill (default) · "step" for invested-style steps */
  sparkStyle?: "area" | "step";
  /** Absolute change over period, e.g. 385 */
  changeAbs?: number;
  /** Format changeAbs as currency (default true when changeAbs set) */
  changeAbsCurrency?: boolean;
  /** Percent change, e.g. 3.2 */
  changePct?: number;
  /** Extra note next to change, e.g. "3 Käufe" */
  changeMeta?: string;
  /** Period chip, default "7T" */
  period?: string;
  /** Subline under change, default "letzte 7 Tage" when period set */
  periodNote?: string;
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
  sparkStyle = "area",
  changeAbs,
  changeAbsCurrency = true,
  changePct,
  changeMeta,
  period = "7T",
  periodNote,
  info,
  infoText,
  className = "",
}: MetricCardProps) {
  const inferredPositive =
    positive ??
    (changePct != null
      ? changePct > 0
      : changeAbs != null
        ? changeAbs > 0
        : undefined);
  const inferredNegative =
    negative ??
    (changePct != null
      ? changePct < 0
      : changeAbs != null
        ? changeAbs < 0
        : undefined);

  const trendPositive = inferredPositive && !inferredNegative;
  const trendNegative = inferredNegative && !inferredPositive;

  const valueColor = accent
    ? "text-[var(--accent)]"
    : ""; // main value stays neutral (like mock) — color on delta only

  const tip =
    infoText ??
    (label === "Gesamtwert" || label === "Kartenwert" || label === "Sealed-Wert"
      ? "Aktueller Marktwert im gewählten Bereich."
      : label === "Investiert"
        ? "Summe aller Einkaufspreise (EK) deiner Positionen."
        : label.includes("Gewinn")
          ? "Marktwert minus investiertes Kapital (unrealisiert + realisiert, Demo)."
          : label === "Rendite"
            ? "Prozentuale Entwicklung: (Marktwert − Investiert) ÷ Investiert."
            : "Weitere Informationen zu dieser Kennzahl.");

  const hasDelta = changeAbs != null || changePct != null || Boolean(changeMeta);
  const note = periodNote ?? (hasDelta || sparkline ? "letzte 7 Tage" : undefined);

  let absText: string | null = null;
  if (changeAbs != null) {
    const sign = changeAbs > 0 ? "+" : changeAbs < 0 ? "−" : "";
    const mag = Math.abs(changeAbs);
    absText = changeAbsCurrency
      ? `${sign}${formatCurrency(mag)}`
      : `${sign}${mag.toLocaleString("de-DE")}`;
  }

  let pctText: string | null = null;
  if (changePct != null) {
    const sign = changePct > 0 ? "+" : changePct < 0 ? "−" : "";
    pctText = `${sign}${Math.abs(changePct).toLocaleString("de-DE")} %`;
  }

  const deltaColor = trendPositive
    ? "text-[var(--positive)]"
    : trendNegative
      ? "text-[var(--negative)]"
      : "text-[var(--muted)]";

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 sm:px-4 sm:py-4 ${className}`}
    >
      {/* Header: label + period chip */}
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
          {label}
          {info && <InfoTip text={tip} />}
        </p>
        {(period || sparkline) && (
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[var(--muted)]">
            {period}
          </span>
        )}
      </div>

      {/* Value + sparkline */}
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`tabular-nums text-xl font-semibold tracking-tight sm:text-[1.35rem] ${valueColor}`}
          >
            {value}
          </p>

          {hasDelta && (
            <p
              className={`mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium tabular-nums ${deltaColor}`}
            >
              {changeAbs != null && changeAbs !== 0 && (
                <span aria-hidden className="text-[10px] leading-none">
                  {trendPositive ? "▲" : trendNegative ? "▼" : "●"}
                </span>
              )}
              {absText && <span>{absText}</span>}
              {absText && pctText && (
                <span className="text-[var(--muted)]">·</span>
              )}
              {pctText && <span>{pctText}</span>}
              {changeMeta && (
                <>
                  <span className="text-[var(--muted)]">·</span>
                  <span className="font-normal text-[var(--muted)]">
                    {changeMeta}
                  </span>
                </>
              )}
            </p>
          )}

          {/* Legacy hint if no structured delta */}
          {!hasDelta && hint && (
            <p
              className={`mt-1.5 text-xs tabular-nums ${
                trendPositive
                  ? "text-[var(--positive)]"
                  : trendNegative
                    ? "text-[var(--negative)]"
                    : "text-[var(--muted)]"
              }`}
            >
              {hint}
            </p>
          )}

          {note && (
            <p className="mt-1 text-[11px] text-[var(--muted)]">{note}</p>
          )}
        </div>

        {sparkline && sparkline.length > 1 && (
          <MiniSparkline
            values={sparkline}
            positive={trendPositive}
            negative={trendNegative}
            accent={accent}
            style={sparkStyle}
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
  accent,
  style = "area",
}: {
  values: number[];
  positive?: boolean;
  negative?: boolean;
  accent?: boolean;
  style?: "area" | "step";
}) {
  const w = 108;
  const h = 52;
  const padY = 4;
  const padX = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const stroke = positive
    ? "var(--positive)"
    : negative
      ? "var(--negative)"
      : accent
        ? "var(--accent)"
        : "var(--accent)";

  const coords = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (w - padX * 2);
    const y = padY + (1 - (v - min) / span) * (h - padY * 2);
    return { x, y };
  });

  let linePath: string;
  if (style === "step") {
    // Horizontal-then-vertical steps (like investment purchases)
    const parts: string[] = [];
    coords.forEach((p, i) => {
      if (i === 0) parts.push(`M ${p.x} ${p.y}`);
      else {
        const prev = coords[i - 1];
        parts.push(`L ${p.x} ${prev.y}`);
        parts.push(`L ${p.x} ${p.y}`);
      }
    });
    linePath = parts.join(" ");
  } else {
    // Smooth-ish polyline
    linePath = coords
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }

  const last = coords[coords.length - 1];
  const first = coords[0];
  const areaPath = `${linePath} L ${last.x} ${h} L ${first.x} ${h} Z`;

  const gradId = `spark-${style}-${positive ? "p" : negative ? "n" : "a"}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="mb-0.5 shrink-0"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {style === "area" && (
        <path d={areaPath} fill={`url(#${gradId})`} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End marker only — no value labels on mini charts */}
      <circle
        cx={last.x}
        cy={last.y}
        r="3.5"
        fill="var(--surface)"
        stroke={stroke}
        strokeWidth="2"
      />
      {style === "step" &&
        coords.map((p, i) =>
          i === 0 || i === coords.length - 1 ? null : (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="var(--surface)"
              stroke={stroke}
              strokeWidth="1.5"
              opacity={0.85}
            />
          ),
        )}
    </svg>
  );
}
