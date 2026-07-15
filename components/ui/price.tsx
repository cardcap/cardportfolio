import { formatCurrency } from "@/lib/format";

export const MARKET_PRICE_DISCLAIMER = "* Durchschnittspreise";

export function formatMarketPrice(value: number): string {
  return `${formatCurrency(value)}*`;
}

export function formatMarketPriceNullable(
  value: number | null | undefined,
  fallback = "—",
): string {
  if (value == null) return fallback;
  return formatMarketPrice(value);
}

type PriceProps = {
  value: number | null | undefined;
  className?: string;
  fallback?: string;
};

export function Price({
  value,
  className = "",
  fallback = "—",
}: PriceProps) {
  if (value == null) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <span className={`tabular-nums ${className}`.trim()}>
      {formatCurrency(value)}*
    </span>
  );
}

type MarketPriceDisclaimerProps = {
  className?: string;
  inline?: boolean;
};

export function MarketPriceDisclaimer({
  className = "",
  inline = false,
}: MarketPriceDisclaimerProps) {
  const Tag = inline ? "span" : "p";

  return (
    <Tag className={`text-xs text-[var(--muted)] ${className}`.trim()}>
      {MARKET_PRICE_DISCLAIMER}
    </Tag>
  );
}