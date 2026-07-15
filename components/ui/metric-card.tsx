type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
};

export function MetricCard({
  label,
  value,
  hint,
  accent,
  positive,
  negative,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`tabular-nums mt-1.5 text-lg font-medium tracking-tight ${
          accent
            ? "text-[var(--accent)]"
            : positive
              ? "text-[var(--positive)]"
              : negative
                ? "text-[var(--negative)]"
                : ""
        }`}
      >
        {value}
      </p>
      {hint && (
        <p
          className={`tabular-nums mt-1 text-xs ${
            positive
              ? "text-[var(--positive)]"
              : negative
                ? "text-[var(--negative)]"
                : "text-[var(--muted)]"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}