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
}: {
  segments: Segment[];
  size?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const center = size / 2;
  const radius = size / 2 - 12;
  const inner = radius - 22;
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

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((arc) => (
            <path key={arc.label} d={arc.d} fill={arc.color} opacity={0.95} />
          ))}
        </svg>
        {(centerLabel || centerSub) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerLabel && (
              <p className="text-xs font-medium text-[var(--foreground)]">
                {centerLabel}
              </p>
            )}
            {centerSub && (
              <p className="text-[10px] text-[var(--muted)]">{centerSub}</p>
            )}
          </div>
        )}
      </div>
      <div className="w-full space-y-2.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
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
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
