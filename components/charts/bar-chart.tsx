type Bar = { label: string; value: number };

export function BarChart({ data, maxValue }: { data: Bar[]; maxValue?: number }) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value)) * 1.1;
  const height = 160;

  return (
    <div className="flex h-40 items-end gap-1.5 sm:gap-2">
      {data.map((bar) => (
        <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-sm bg-[var(--accent)] opacity-80"
            style={{ height: `${(bar.value / max) * height}px` }}
          />
          <span className="text-[10px] text-[var(--muted)]">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}