type Segment = { label: string; percent: number; color: string };

export function DonutChart({
  segments,
  size = 140,
}: {
  segments: Segment[];
  size?: number;
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
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.d} fill={arc.color} opacity={0.9} />
        ))}
      </svg>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[var(--muted)]">{s.label}</span>
            <span className="tabular-nums font-medium">{s.percent} %</span>
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