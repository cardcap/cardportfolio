export type TcgSet = {
  id: string;
  name: string;
  series: string;
  seriesId?: string;
  total: number;
  official?: number;
  secretRareCount?: number;
  releaseDate: string;
  images: { logo: string; symbol: string; fallbacks?: string[] };
};

export type TcgCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  category?: string;
  set: { id: string; name: string };
  /** z. B. POR 12/98 */
  collectorId?: string;
  setCode?: string;
  images: { small: string; large: string };
  imageFallbacks?: string[];
  tcgplayer?: {
    prices?: Record<
      string,
      { market?: number; mid?: number; low?: number } | undefined
    >;
  };
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
      trendPrice?: number;
      lowPrice?: number;
    };
  };
};

export type CardsResponse = {
  data: TcgCard[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type SetsResponse = {
  data: TcgSet[];
  totalCount: number;
};

const API_BASE = "https://api.pokemontcg.io/v2";

function normalizeImageUrl(url: string): string {
  if (
    url.includes("assets.tcgdex.net") &&
    !url.endsWith(".webp") &&
    !url.endsWith(".png")
  ) {
    return `${url}/high.webp`;
  }
  return url;
}

function pokemonTcgUrlsFromCardId(cardId: string): string[] {
  const dash = cardId.lastIndexOf("-");
  if (dash <= 0) return [];
  const setId = cardId.slice(0, dash);
  const number = cardId.slice(dash + 1);
  if (!setId || !number) return [];
  const normalized = /^\d+$/.test(number)
    ? String(parseInt(number, 10))
    : number;
  return [
    `https://images.pokemontcg.io/${setId}/${normalized}_hires.png`,
    `https://images.pokemontcg.io/${setId}/${normalized}.png`,
  ];
}

/** Swap TCGdex language segment to English when non-EN scans are missing */
function tcgdexEnglishMirrors(url: string): string[] {
  if (!url.includes("assets.tcgdex.net")) return [];
  const en = url.replace(
    /assets\.tcgdex\.net\/(?:de|fr|es|it|ja|pt|nl|pl|ru|ko|zh-tw|zh-cn)\//i,
    "assets.tcgdex.net/en/",
  );
  return en !== url ? [en] : [];
}

export function getCardImageUrl(card: TcgCard): string {
  if (card.images?.large) return normalizeImageUrl(card.images.large);
  if (card.images?.small) return normalizeImageUrl(card.images.small);

  const ptcg = pokemonTcgUrlsFromCardId(card.id);
  return ptcg[0] ?? "";
}

export function getCardImageFallbacks(card: TcgCard): string[] {
  const urls: string[] = [];

  if (card.imageFallbacks?.length) {
    for (const u of card.imageFallbacks) {
      if (!u) continue;
      urls.push(u);
      urls.push(...tcgdexEnglishMirrors(u));
    }
  }

  if (card.images?.large) {
    const large = normalizeImageUrl(card.images.large);
    urls.push(large, ...tcgdexEnglishMirrors(large));
  }
  if (card.images?.small) {
    const small = normalizeImageUrl(card.images.small);
    urls.push(small, ...tcgdexEnglishMirrors(small));
  }

  const base =
    card.images?.large?.replace(/\/high\.webp$/, "") ??
    card.images?.small?.replace(/\/low\.webp$/, "");
  if (base?.includes("assets.tcgdex.net")) {
    urls.push(`${base}/high.webp`, `${base}/low.webp`);
    for (const en of tcgdexEnglishMirrors(base)) {
      urls.push(`${en}/high.webp`, `${en}/low.webp`);
    }
  }

  // Last resort: Pokémon TCG API CDN (works for many classic English scans)
  urls.push(...pokemonTcgUrlsFromCardId(card.id));

  // Drop primary so CardImage does not retry the same failed URL twice
  const primary = getCardImageUrl(card);
  return [...new Set(urls.filter(Boolean).filter((u) => u !== primary))];
}

export function getCardPrice(card: TcgCard): number | null {
  const cm = card.cardmarket?.prices;
  if (cm?.trendPrice) return cm.trendPrice;
  if (cm?.averageSellPrice) return cm.averageSellPrice;
  if (cm?.lowPrice) return cm.lowPrice;

  const tp = card.tcgplayer?.prices;
  if (!tp) return null;

  for (const variant of Object.values(tp)) {
    if (variant?.market) return variant.market;
    if (variant?.mid) return variant.mid;
  }

  return null;
}

export function buildCardQuery(params: {
  search?: string;
  setId?: string;
  rarity?: string;
}): string {
  const parts: string[] = [];

  if (params.search?.trim()) {
    const term = params.search.trim().replace(/[":\\]/g, "");
    parts.push(`name:${term}*`);
  }

  if (params.setId) {
    parts.push(`set.id:${params.setId}`);
  }

  if (params.rarity && params.rarity !== "all") {
    parts.push(`rarity:"${params.rarity}"`);
  }

  return parts.join(" ");
}

export async function fetchCardsFromApi(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  setId?: string;
  rarity?: string;
}): Promise<CardsResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const q = buildCardQuery(params);

  const url = new URL(`${API_BASE}/cards`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("orderBy", "-set.releaseDate,number");
  if (q) url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }

  const json = await res.json();

  return {
    data: json.data ?? [],
    page: json.page ?? page,
    pageSize: json.pageSize ?? pageSize,
    totalCount: json.totalCount ?? 0,
    totalPages: Math.ceil((json.totalCount ?? 0) / pageSize),
  };
}

export async function fetchSetsFromApi(): Promise<SetsResponse> {
  const url = new URL(`${API_BASE}/sets`);
  url.searchParams.set("pageSize", "250");
  url.searchParams.set("orderBy", "-releaseDate");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`Pokemon TCG API error: ${res.status}`);
  }

  const json = await res.json();

  return {
    data: json.data ?? [],
    totalCount: json.totalCount ?? 0,
  };
}