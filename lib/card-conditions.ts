import type { TcgCard } from "@/lib/pokemon-tcg";
import { getCardPrice } from "@/lib/pokemon-tcg";

/** Rohzustände best → worst (Cardmarket-ähnlich) */
export const RAW_CONDITIONS = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Good",
  "Light Played",
  "Played",
  "Poor",
] as const;

/** Worst → best (for display order in multi-exemplar lists) */
export const RAW_CONDITIONS_WORST_FIRST = [
  "Poor",
  "Played",
  "Light Played",
  "Good",
  "Excellent",
  "Near Mint",
  "Mint",
] as const;

/** Higher = better. Unknown conditions rank in the middle. */
export function conditionRank(condition: string): number {
  const idx = (RAW_CONDITIONS_WORST_FIRST as readonly string[]).indexOf(
    condition,
  );
  if (idx >= 0) return idx;
  // PSA higher grade = better
  if (condition.startsWith("PSA")) {
    const n = Number.parseInt(condition.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? 50 + n : 25;
  }
  return 25;
}

/** Sort conditions worst → best */
export function sortConditionsWorstFirst(conditions: string[]): string[] {
  return [...conditions].sort((a, b) => conditionRank(a) - conditionRank(b));
}

/** Legacy PSA labels — not offered in UI filters anymore */
export const PSA_CONDITIONS = [
  "PSA 10",
  "PSA 9",
  "PSA 8",
  "PSA 7",
  "PSA 6",
] as const;

export const CARD_CONDITIONS = [
  "Alle Zustände",
  ...RAW_CONDITIONS,
] as const;

export type CardCondition = (typeof CARD_CONDITIONS)[number];

/** Cardmarket-Trend ≈ Near Mint; Rohzustände geschätzt */
const CONDITION_MULTIPLIERS: Record<
  Exclude<CardCondition, "Alle Zustände"> | (typeof PSA_CONDITIONS)[number],
  number
> = {
  Mint: 1.05,
  "Near Mint": 1,
  Excellent: 0.85,
  Good: 0.7,
  "Light Played": 0.55,
  Played: 0.4,
  Poor: 0.25,
  "PSA 10": 4,
  "PSA 9": 2.2,
  "PSA 8": 1.5,
  "PSA 7": 1.2,
  "PSA 6": 1,
};

export function isCardCondition(value: string): value is CardCondition {
  return CARD_CONDITIONS.includes(value as CardCondition);
}

export function isPsaCondition(condition: string): boolean {
  return (PSA_CONDITIONS as readonly string[]).includes(condition);
}

export function getEffectiveCondition(
  condition: string,
): Exclude<CardCondition, "Alle Zustände"> | (typeof PSA_CONDITIONS)[number] {
  if (isCardCondition(condition) && condition !== "Alle Zustände") {
    return condition;
  }
  if (isPsaCondition(condition)) {
    return condition as (typeof PSA_CONDITIONS)[number];
  }
  return "Near Mint";
}

export function getCardPriceForCondition(
  card: TcgCard,
  condition: string,
): number | null {
  const base = getCardPrice(card);
  if (base == null) return null;

  const effective = getEffectiveCondition(condition);
  const multiplier = CONDITION_MULTIPLIERS[effective];
  return Math.round(base * multiplier * 100) / 100;
}

export function isEstimatedCondition(condition: string): boolean {
  const effective = getEffectiveCondition(condition);
  return effective !== "Near Mint";
}

export function getConditionPriceHint(condition: string): string | null {
  if (!isEstimatedCondition(condition)) return null;
  if (isPsaCondition(condition)) {
    return "Geschätzt (keine PSA-Marktdaten)";
  }
  return "Geschätzt (Cardmarket ≈ Near Mint)";
}