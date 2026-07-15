import "server-only";

import { getCardImageUrl, type TcgCard } from "@/lib/pokemon-tcg";
import {
  loadCachedCards,
  resolveSetImageUrls,
  tcgCardFromCached,
  type TcgdexCachedCard,
  type TcgdexCachedSet,
} from "@/lib/tcgdex";
import type { CardLanguage } from "@/lib/tcgdex-constants";

export type SetTopCard = {
  id: string;
  name: string;
  number: string;
  price: number;
  rarity?: string;
  imageUrl: string;
};

export type SetSummary = {
  id: string;
  name: string;
  seriesId: string;
  seriesName: string;
  releaseDate: string;
  totalCards: number;
  officialCards: number;
  secretRareCount: number;
  logoUrl: string;
  symbolUrl: string;
};

export type SetDetail = SetSummary & {
  topCards: SetTopCard[];
};

export function getSecretRareCount(set: TcgdexCachedSet): number {
  const total = set.cardCount?.total ?? 0;
  const official = set.cardCount?.official ?? total;
  return Math.max(0, total - official);
}

export function getCardTrendPrice(card: TcgdexCachedCard): number | null {
  const price = card.pricing?.trend ?? card.pricing?.avg ?? card.pricing?.low;
  return price != null && price > 0 ? price : null;
}

export function getTopValuableCards(
  setId: string,
  cards: TcgdexCachedCard[],
  setMeta: TcgdexCachedSet | undefined,
  lang: CardLanguage,
  limit = 5,
): SetTopCard[] {
  const setName = setMeta?.name ?? setId;

  return cards
    .filter((card) => card.setId === setId)
    .map((card) => ({ card, price: getCardTrendPrice(card) }))
    .filter((entry): entry is { card: TcgdexCachedCard; price: number } =>
      entry.price != null,
    )
    .sort((a, b) => b.price - a.price)
    .slice(0, limit)
    .map(({ card, price }) => {
      const tcg: TcgCard = tcgCardFromCached(card, setName, lang, setMeta);
      return {
        id: card.id,
        name: card.name,
        number: card.localId,
        price,
        rarity: card.rarity,
        imageUrl: getCardImageUrl(tcg),
      };
    });
}

export function buildSetSummary(
  set: TcgdexCachedSet,
  seriesNames: Map<string, string>,
  lang: CardLanguage,
): SetSummary {
  const seriesId = set.serieId ?? "";
  const totalCards = set.cardCount?.total ?? 0;
  const officialCards = set.cardCount?.official ?? totalCards;
  const images = resolveSetImageUrls(set, lang);

  return {
    id: set.id,
    name: set.name,
    seriesId,
    seriesName: seriesNames.get(seriesId) ?? seriesId,
    releaseDate: set.releaseDate ?? "",
    totalCards,
    officialCards,
    secretRareCount: getSecretRareCount(set),
    logoUrl: images.logo,
    symbolUrl: images.symbol,
  };
}

export function buildSetDetail(
  set: TcgdexCachedSet,
  seriesNames: Map<string, string>,
  lang: CardLanguage,
  topLimit = 5,
): SetDetail {
  const summary = buildSetSummary(set, seriesNames, lang);
  const cards = loadCachedCards(lang) ?? [];

  return {
    ...summary,
    topCards: getTopValuableCards(set.id, cards, set, lang, topLimit),
  };
}