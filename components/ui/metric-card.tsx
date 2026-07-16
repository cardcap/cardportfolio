import { formatCurrency } from "@/lib/format";

type MetricCardProps = {
  label: string;
  value: string;
  /** @deprecated use changeAbs / changePct / periodNote */
  hint?: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
  /** Color the main value green/red (for G/V, Rendite) */
  colorValue?: boolean;
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
  /**
   * Extra note, e.g. "3 Käufe".
   * Default: below periodNote (so „letzte 7 Tage“ stays aligned across cards).
   * Set metaWithDelta to show it on the change line instead.
   */
  changeMeta?: string;
  /** Put changeMeta on the €/Δ line instead of under periodNote */
  metaWithDelta?: boolean;
  /** Optional period chip (e.g. "7T") — omit to hide */
  period?: string;
  /** Subline under change, e.g. "letzte 7 Tage" */
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
  colorValue = false,
  sparkline,
  sparkStyle = "area",
  changeAbs,
  changeAbsCurrency = true,
  changePct,
  changeMeta,
  metaWithDelta = false,
  period,
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
    // Explicit positive={false} with colorValue → treat as loss (red)
    (positive === false && colorValue
      ? true
      : changePct != null
        ? changePct < 0
        : changeAbs != null
          ? changeAbs < 0
          : undefined);

  const trendPositive = Boolean(inferredPositive) && !inferredNegative;
  const trendNegative = Boolean(inferredNegative) && !inferredPositive;

  const valueColor = accent
    ? "text-[var(--accent)]"
    : colorValue && trendPositive
      ? "text-[var(--positive)]"
      : colorValue && trendNegative
        ? "text-[var(--negative)]"
        : "";

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

  const hasDelta =
    changeAbs != null || changePct != null || (metaWithDelta && Boolean(changeMeta));
  const note = periodNote;

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
      className={`flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 sm:px-4 sm:py-4 ${className}`}
    >
      {/* Header — no period chip unless explicitly set */}
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
          {label}
          {info && <InfoTip text={tip} />}
        </p>
        {period ? (
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs font-medium tabular-nums text-[var(--muted)]">
            {period}
          </span>
        ) : null}
      </div>

      {/* Body: text + sparkline; baseline of chart aligns with “letzte 7 Tage” */}
      <div className="mt-2.5 flex min-h-0 flex-1 items-end justify-between gap-3">
        <div className="flex min-h-[4.75rem] min-w-0 flex-1 flex-col justify-end">
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
              {metaWithDelta && changeMeta && (
                <>
                  <span className="text-[var(--muted)]">·</span>
                  <span className="font-normal text-[var(--muted)]">
                    {changeMeta}
                  </span>
                </>
              )}
            </p>
          )}

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

          {/* Footer line — same vertical band as sparkline baseline */}
          {(note || (!metaWithDelta && changeMeta)) && (
            <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
              {note}
              {note && !metaWithDelta && changeMeta ? " · " : null}
              {!metaWithDelta && changeMeta ? changeMeta : null}
            </p>
          )}
        </div>

        {sparkline && sparkline.length > 1 ? (
          <div className="flex shrink-0 flex-col justify-end pb-0">
            <MiniSparkline
              values={sparkline}
              positive={trendPositive}
              negative={trendNegative}
              accent={accent}
              style={sparkStyle}
            />
          </div>
        ) : null}
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

/** Smooth cubic path through points (no labels — only geometry). */
function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  if (coords.length === 2) {
    return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  }
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
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
  // Padding keeps start/end dots fully visible (no clip)
  const w = 118;
  const h = 58;
  const padX = 8;
  const padTop = 8;
  const baselineY = h - 6;
  const plotBottom = baselineY - 3;
  const plotTop = padTop;
  const plotH = Math.max(1, plotBottom - plotTop);

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
    const y = plotTop + (1 - (v - min) / span) * plotH;
    return { x, y };
  });

  let linePath: string;
  if (style === "step") {
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
    linePath = smoothPath(coords);
  }

  const last = coords[coords.length - 1];
  const first = coords[0];
  const areaPath = `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  const gradId = `spark-${style}-${positive ? "p" : negative ? "n" : "a"}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="55%" stopColor={stroke} stopOpacity="0.1" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Dashed axis under the curve — like mock, no tick labels */}
      <line
        x1={padX}
        y1={baselineY}
        x2={w - padX}
        y2={baselineY}
        stroke="currentColor"
        className="text-[var(--muted)]"
        strokeWidth="1.25"
        strokeDasharray="2.5 3"
        strokeLinecap="round"
        opacity={0.55}
      />

      {/* Gradient fill under the line for both area + step charts */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {style === "step" ? (
        coords.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === 0 ? 3.25 : i === coords.length - 1 ? 4.25 : 2.75}
            fill="var(--surface)"
            stroke={stroke}
            strokeWidth={i === coords.length - 1 ? 2.25 : 1.75}
          />
        ))
      ) : (
        <>
          {/* Start + end dots (no euro labels) */}
          <circle
            cx={first.x}
            cy={first.y}
            r="3.25"
            fill="var(--surface)"
            stroke={stroke}
            strokeWidth="1.75"
            opacity={0.95}
          />
          <circle
            cx={last.x}
            cy={last.y}
            r="4.25"
            fill="var(--surface)"
            stroke={stroke}
            strokeWidth="2.25"
          />
        </>
      )}
    </svg>
  );
}
