type Segment = {
  label: string;
  percent: number;
  color: string;
  value?: number;
};

export function DonutChart({
  segments,
  size = 140,
  centerLabel,
  centerSub,
  /** Hide built-in side legend (when parent renders its own) */
  hideLegend = false,
  ringWidth = 22,
}: {
  segments: Segment[];
  size?: number;
  centerLabel?: string;
  centerSub?: string;
  hideLegend?: boolean;
  ringWidth?: number;
}) {
  const center = size / 2;
  const radius = size / 2 - 8;
  const inner = Math.max(radius - ringWidth, size * 0.28);
  let cumulative = 0;

  const arcs = segments.map((segment) => {
    const startAngle = (cumulative / 100) * 360 - 90;
    cumulative += segment.percent;
    const endAngle = (cumulative / 100) * 360 - 90;

    const start = polar(center, center, radius, startAngle);
    const end = polar(center, center, radius, endAngle);
    const innerStart = polar(center, center, inner, endAngle);
    const innerEnd = polar(center, center, inner, startAngle);
    const largeArc = segment.percent > 50 ? 1 : 0;

    const d = [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${inner} ${inner} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
      "Z",
    ].join(" ");

    return { ...segment, d };
  });

  const hole = inner * 2 - 8;

  return (
    <div
      className={`flex flex-col items-center gap-4 ${
        hideLegend ? "" : "sm:flex-row sm:items-center"
      }`}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((arc) => (
            <path key={arc.label} d={arc.d} fill={arc.color} opacity={0.95} />
          ))}
        </svg>
        {(centerLabel || centerSub) && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 px-2.5 text-center"
            style={{ width: hole, maxWidth: hole }}
          >
            {centerLabel && (
              <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--muted)] sm:text-[10px]">
                {centerLabel}
              </p>
            )}
            {centerSub && (
              <p className="break-words text-[11px] font-semibold leading-snug tracking-tight tabular-nums sm:text-xs">
                {centerSub}
              </p>
            )}
          </div>
        )}
      </div>
      {!hideLegend && (
        <div className="w-full space-y-2.5">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="flex-1 text-[var(--muted)]">{s.label}</span>
              {s.value != null && (
                <span className="tabular-nums text-[var(--muted)]">
                  €{" "}
                  {s.value.toLocaleString("de-DE", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              )}
              <span className="tabular-nums w-10 text-right font-medium">
                {s.percent} %
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
