import { collection } from "@/lib/mock-data";

/** TCGdex-IDs aller Karten in der (Demo-)Sammlung */
export function getCollectionTcgIds(): Set<string> {
  const ids = collection
    .map((row) => row.tcgCardId)
    .filter((id): id is string => Boolean(id));
  return new Set(ids);
}

export function isInCollection(tcgCardId: string, ownedIds: Set<string>): boolean {
  return ownedIds.has(tcgCardId);
}