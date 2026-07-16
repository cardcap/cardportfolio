const styles: Record<string, string> = {
  Mint: "bg-[var(--positive-soft)] text-[var(--positive)]",
  "Near Mint": "bg-[var(--positive-soft)] text-[var(--positive)]",
  Excellent: "bg-[var(--warning-soft)] text-[var(--warning)]",
  Good: "bg-[var(--warning-soft)] text-[var(--warning)]",
  "Light Played": "bg-[var(--warning-soft)] text-[var(--warning)]",
  Played: "bg-[var(--negative-soft)] text-[var(--negative)]",
  Poor: "bg-[var(--negative-soft)] text-[var(--negative)]",
};

export function ConditionBadge({ condition }: { condition: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${styles[condition] ?? "bg-[var(--surface-elevated)] text-[var(--muted)]"}`}
    >
      {condition}
    </span>
  );
}