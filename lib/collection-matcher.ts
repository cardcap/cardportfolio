import "server-only";

import {
  DEFAULT_LANGUAGE,
  type CardLanguage,
} from "@/lib/tcgdex-constants";
import {
  loadCachedCards,
  loadCachedSets,
  resolveCardImages,
  type TcgdexCachedCard,
  type TcgdexCachedSet,
} from "@/lib/tcgdex";

export type ParsedImportRow = {
  rowIndex: number;
  name: string;
  set: string;
  number: string;
  language: CardLanguage;
  quantity: number;
  condition: string;
  purchasePrice: number | null;
  purchaseDate: string;
  tcgCardId: string;
};

export type MatchCandidate = {
  tcgCardId: string;
  name: string;
  setName: string;
  number: string;
};

export type MatchResult = {
  status: "matched" | "uncertain" | "not_found";
  confidence: "exact" | "high" | "medium" | "low" | "none";
  tcgCardId?: string;
  matchedName?: string;
  matchedSet?: string;
  matchedNumber?: string;
  imageUrl?: string;
  candidates: MatchCandidate[];
};

export type CardIndex = {
  byId: Map<string, TcgdexCachedCard>;
  bySetAndNumber: Map<string, TcgdexCachedCard[]>;
  bySetNameAndNumber: Map<string, TcgdexCachedCard[]>;
  byName: Map<string, TcgdexCachedCard[]>;
  setNames: Map<string, string>;
  setMeta: Map<string, TcgdexCachedSet>;
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function normalizeLocalId(value: string): string[] {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return [];
  const withoutZeros = trimmed.replace(/^0+/, "") || "0";
  return [...new Set([trimmed, withoutZeros])];
}

function uniqueCards(cards: TcgdexCachedCard[]): TcgdexCachedCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

function pushToMap(
  map: Map<string, TcgdexCachedCard[]>,
  key: string,
  card: TcgdexCachedCard,
) {
  const bucket = map.get(key) ?? [];
  bucket.push(card);
  map.set(key, bucket);
}

export function buildCardIndex(lang: CardLanguage): CardIndex {
  const cards = loadCachedCards(lang) ?? [];
  const sets = loadCachedSets(lang) ?? [];

  const setNames = new Map<string, string>();
  const setMeta = new Map<string, TcgdexCachedSet>();
  for (const set of sets) {
    setNames.set(set.id, set.name);
    setMeta.set(set.id, set);
  }

  const byId = new Map<string, TcgdexCachedCard>();
  const bySetAndNumber = new Map<string, TcgdexCachedCard[]>();
  const bySetNameAndNumber = new Map<string, TcgdexCachedCard[]>();
  const byName = new Map<string, TcgdexCachedCard[]>();

  for (const card of cards) {
    byId.set(card.id.toLowerCase(), card);

    const numberKeys = normalizeLocalId(card.localId);
    for (const numberKey of numberKeys) {
      pushToMap(bySetAndNumber, `${card.setId}|${numberKey}`, card);

      const setName = setNames.get(card.setId);
      if (setName) {
        pushToMap(
          bySetNameAndNumber,
          `${normalizeText(setName)}|${numberKey}`,
          card,
        );
        pushToMap(
          bySetNameAndNumber,
          `${normalizeText(card.setId)}|${numberKey}`,
          card,
        );
      }
    }

    pushToMap(byName, normalizeText(card.name), card);
  }

  return {
    byId,
    bySetAndNumber,
    bySetNameAndNumber,
    byName,
    setNames,
    setMeta,
  };
}

function toCandidate(
  card: TcgdexCachedCard,
  index: CardIndex,
): MatchCandidate {
  return {
    tcgCardId: card.id,
    name: card.name,
    setName: index.setNames.get(card.setId) ?? card.setId,
    number: card.localId,
  };
}

function finalizeMatch(
  cards: TcgdexCachedCard[],
  index: CardIndex,
  confidence: MatchResult["confidence"],
): MatchResult {
  const unique = uniqueCards(cards);
  const candidates = unique.slice(0, 5).map((card) => toCandidate(card, index));

  if (unique.length === 1) {
    const card = unique[0];
    const images = resolveCardImages(
      card,
      DEFAULT_LANGUAGE,
      index.setMeta.get(card.setId),
    );

    return {
      status: confidence === "low" ? "uncertain" : "matched",
      confidence,
      tcgCardId: card.id,
      matchedName: card.name,
      matchedSet: index.setNames.get(card.setId) ?? card.setId,
      matchedNumber: card.localId,
      imageUrl: images.large || images.small,
      candidates,
    };
  }

  if (unique.length > 1) {
    return {
      status: "uncertain",
      confidence: "low",
      candidates,
    };
  }

  return {
    status: "not_found",
    confidence: "none",
    candidates: [],
  };
}

export function matchImportRow(
  row: ParsedImportRow,
  index: CardIndex,
): MatchResult {
  if (row.tcgCardId) {
    const byId = index.byId.get(row.tcgCardId.toLowerCase());
    if (byId) {
      return finalizeMatch([byId], index, "exact");
    }
  }

  const numberKeys = normalizeLocalId(row.number);
  const normalizedSet = normalizeText(row.set);

  if (normalizedSet && numberKeys.length > 0) {
    for (const numberKey of numberKeys) {
      const bySetId = index.bySetAndNumber.get(`${row.set}|${numberKey}`);
      if (bySetId?.length) {
        return finalizeMatch(bySetId, index, "exact");
      }

      const bySetName = index.bySetNameAndNumber.get(
        `${normalizedSet}|${numberKey}`,
      );
      if (bySetName?.length) {
        return finalizeMatch(bySetName, index, "high");
      }
    }
  }

  if (row.name && normalizedSet) {
    const nameMatches = index.byName.get(normalizeText(row.name)) ?? [];
    const inSet = nameMatches.filter((card) => {
      const setName = index.setNames.get(card.setId) ?? "";
      return (
        normalizeText(setName) === normalizedSet ||
        normalizeText(card.setId) === normalizedSet
      );
    });

    if (numberKeys.length > 0) {
      const withNumber = inSet.filter((card) =>
        normalizeLocalId(card.localId).some((key) => numberKeys.includes(key)),
      );
      if (withNumber.length) {
        return finalizeMatch(withNumber, index, "medium");
      }
    }

    if (inSet.length) {
      return finalizeMatch(inSet, index, inSet.length === 1 ? "medium" : "low");
    }
  }

  if (row.name) {
    const nameMatches = index.byName.get(normalizeText(row.name)) ?? [];
    if (numberKeys.length > 0) {
      const withNumber = nameMatches.filter((card) =>
        normalizeLocalId(card.localId).some((key) => numberKeys.includes(key)),
      );
      if (withNumber.length) {
        return finalizeMatch(withNumber, index, "medium");
      }
    }

    if (nameMatches.length) {
      return finalizeMatch(
        nameMatches,
        index,
        nameMatches.length === 1 ? "medium" : "low",
      );
    }
  }

  return {
    status: "not_found",
    confidence: "none",
    candidates: [],
  };
}