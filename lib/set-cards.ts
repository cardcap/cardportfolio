import "server-only";

import type { TcgCard } from "@/lib/pokemon-tcg";
import { fetchCardsFromTcgdex } from "@/lib/tcgdex";
import type { CardLanguage } from "@/lib/tcgdex-constants";

const PAGE_SIZE = 250;

export async function fetchAllSetCards(
  setId: string,
  lang: CardLanguage,
): Promise<{ cards: TcgCard[]; totalCount: number }> {
  const first = await fetchCardsFromTcgdex({
    lang,
    setId,
    page: 1,
    pageSize: PAGE_SIZE,
  });

  let cards = [...first.data];
  const totalPages = first.totalPages ?? 1;

  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchCardsFromTcgdex({
      lang,
      setId,
      page,
      pageSize: PAGE_SIZE,
    });
    cards = cards.concat(next.data);
  }

  const seen = new Set<string>();
  cards = cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });

  return {
    cards,
    totalCount: first.totalCount ?? cards.length,
  };
}