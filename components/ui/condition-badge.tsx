/**
 * Cardmarket-style condition colors (MT → PO).
 * Soft fill + saturated text, works on dark UI.
 */
const styles: Record<string, string> = {
  // Mint (MT) — cooler cyan (Cardmarket: lightest/best green-blue)
  Mint: "bg-[#06b6d4]/20 text-[#22d3ee] ring-1 ring-[#06b6d4]/40",
  MT: "bg-[#06b6d4]/20 text-[#22d3ee] ring-1 ring-[#06b6d4]/40",
  // Near Mint (NM) — warmer teal-green (clearly distinct from Mint)
  "Near Mint": "bg-[#0f766e]/22 text-[#2dd4bf] ring-1 ring-[#0f766e]/40",
  NM: "bg-[#0f766e]/22 text-[#2dd4bf] ring-1 ring-[#0f766e]/40",
  // Excellent — olive
  Excellent: "bg-[#84994a]/22 text-[#b5c75a] ring-1 ring-[#84994a]/40",
  EX: "bg-[#84994a]/22 text-[#b5c75a] ring-1 ring-[#84994a]/40",
  // Good — gold / yellow
  Good: "bg-[#ca8a04]/20 text-[#fbbf24] ring-1 ring-[#ca8a04]/40",
  GD: "bg-[#ca8a04]/20 text-[#fbbf24] ring-1 ring-[#ca8a04]/40",
  // Light Played — orange
  "Light Played": "bg-[#ea580c]/20 text-[#fb923c] ring-1 ring-[#ea580c]/40",
  LP: "bg-[#ea580c]/20 text-[#fb923c] ring-1 ring-[#ea580c]/40",
  // Played — coral red
  Played: "bg-[#dc2626]/18 text-[#f87171] ring-1 ring-[#dc2626]/35",
  PL: "bg-[#dc2626]/18 text-[#f87171] ring-1 ring-[#dc2626]/35",
  // Poor — pink / magenta red
  Poor: "bg-[#db2777]/18 text-[#f472b6] ring-1 ring-[#db2777]/35",
  PO: "bg-[#db2777]/18 text-[#f472b6] ring-1 ring-[#db2777]/35",
};

const SHORT: Record<string, string> = {
  Mint: "MT",
  "Near Mint": "NM",
  Excellent: "EX",
  Good: "GD",
  "Light Played": "LP",
  Played: "PL",
  Poor: "PO",
};

type ConditionBadgeProps = {
  condition: string;
  /** Show Cardmarket short code (MT, NM, …) instead of full name */
  short?: boolean;
};

export function ConditionBadge({
  condition,
  short = false,
}: ConditionBadgeProps) {
  const label = short
    ? (SHORT[condition] ?? condition)
    : condition;
  const styleKey = SHORT[condition] ? condition : condition;
  const className =
    styles[styleKey] ??
    styles[condition] ??
    "bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${className}`}
      title={condition}
    >
      {label}
    </span>
  );
}
