export function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-[var(--border-strong)] ${className}`}
    >
      <div
        className="h-full rounded-full bg-[var(--accent)] transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}