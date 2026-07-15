import "server-only";

import fs from "fs";
import path from "path";
import {
  cardMatchesColor,
  isAllColorsFilter as isAllColorsFilterValue,
  resolveColorForTcgdexApi,
} from "@/lib/card-colors";
import { formatCollectorCardId, getSetCollectorCode } from "@/lib/collector-id";
import {
  cardMatchesEnglishRarity,
  isAllRaritiesFilter,
  resolveRarityForApi,
} from "@/lib/rarity-labels";
import type { CardsResponse, TcgCard, TcgSet } from "@/lib/pokemon-tcg";
import { COLORS_BY_LANG } from "@/lib/tcgdex-constants";
import {
  DEFAULT_LANGUAGE,
  type CardLanguage,
} from "@/lib/tcgdex-constants";

export {
  CARD_LANGUAGES,
  DEFAULT_LANGUAGE,
  RARITIES_BY_LANG,
  isCardLanguage,
  type CardLanguage,
} from "@/lib/tcgdex-constants";

export type TcgdexCachedCard = {
  id: string;
  localId: string;
  name: string;
  image?: string;
  setId: string;
  rarity?: string;
  types?: string[];
  category?: string;
  pricing?: {
    trend?: number;
    avg?: number;
    low?: number;
    avg7?: number;
    avg30?: number;
    updatedAt?: string;
    unit?: string;
    source?: "cardmarket" | "tcgplayer";
  };
};

export type TcgdexCachedSet = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  serieId?: string;
  releaseDate?: string;
  cardCount?: { total?: number; official?: number };
};

type CardsCacheFile = {
  updatedAt: string;
  pricesUpdatedAt?: string;
  lang: CardLanguage;
  cards: TcgdexCachedCard[];
};

type SetsCacheFile = {
  updatedAt: string;
  lang: CardLanguage;
  sets: TcgdexCachedSet[];
};

type CacheEntry<T> = {
  stamp: string;
  data: T;
};

const TCGDEX_API = "https://api.tcgdex.net/v2";
const DATA_DIR = path.join(process.cwd(), "data");

const cacheMem = {
  cards: new Map<CardLanguage, CacheEntry<TcgdexCachedCard[]>>(),
  sets: new Map<CardLanguage, CacheEntry<TcgdexCachedSet[]>>(),
  series: new Map<CardLanguage, CacheEntry<Map<string, string>>>(),
};

export function extractSetId(cardId: string): string {
  const dash = cardId.lastIndexOf("-");
  return dash > 0 ? cardId.slice(0, dash) : cardId;
}

export function extractSerieId(set: TcgdexCachedSet): string | null {
  if (set.serieId) return set.serieId;

  const url = set.logo ?? set.symbol ?? "";
  const match = url.match(
    /\/(?:univ|de|en|fr|es|it|ja)\/([^/]+)\/[^/]+(?:\/|$)/,
  );
  return match?.[1] ?? null;
}

const TCGDEX_ASSET_EXT = /\.(webp|png|jpg|jpeg|gif|svg)$/i;

export function normalizeTcgdexAssetUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.replace(/\/$/, "");
  if (TCGDEX_ASSET_EXT.test(trimmed)) return trimmed;
  return `${trimmed}.webp`;
}

export function buildSetLogoUrl(
  set: TcgdexCachedSet,
  lang: CardLanguage,
): string {
  if (set.logo) return normalizeTcgdexAssetUrl(set.logo);

  const serieId = extractSerieId(set);
  if (!serieId) return "";

  return `https://assets.tcgdex.net/${lang}/${serieId}/${set.id}/logo.webp`;
}

export function buildSetSymbolUrl(set: TcgdexCachedSet): string {
  if (set.symbol) return normalizeTcgdexAssetUrl(set.symbol);

  const serieId = extractSerieId(set);
  if (!serieId) return "";

  return `https://assets.tcgdex.net/univ/${serieId}/${set.id}/symbol.webp`;
}

export function resolveSetImageUrls(
  set: TcgdexCachedSet,
  lang: CardLanguage,
): { logo: string; symbol: string; fallbacks: string[] } {
  const symbol = buildSetSymbolUrl(set);
  let logo = "";

  if (set.logo) {
    logo = normalizeTcgdexAssetUrl(set.logo);
  } else if (symbol) {
    logo = symbol;
  } else {
    logo = buildSetLogoUrl(set, lang);
  }

  // Additional sources when TCGdex logo is missing
  const fallbacks = [
    logo,
    symbol,
    buildSetLogoUrl(set, lang),
    buildSetLogoUrl(set, "en"),
    `https://images.pokemontcg.io/${set.id}/logo.png`,
    symbol ? symbol.replace(/\.webp$/i, ".png") : "",
  ].filter(Boolean);

  return {
    logo,
    symbol,
    fallbacks: [...new Set(fallbacks)].filter((u) => u !== logo),
  };
}

function normalizeImageBase(url: string): string {
  return url
    .replace(/\/high\.webp$/, "")
    .replace(/\/low\.webp$/, "")
    .replace(/\/$/, "");
}

function buildImageCandidates(
  card: TcgdexCachedCard,
  lang: CardLanguage,
  set?: TcgdexCachedSet,
): string[] {
  const candidates: string[] = [];
  const serieId = set ? extractSerieId(set) : null;

  if (card.image) {
    candidates.push(normalizeImageBase(card.image));
  }

  if (serieId) {
    candidates.push(
      `https://assets.tcgdex.net/${lang}/${serieId}/${card.setId}/${card.localId}`,
    );
  }

  return [...new Set(candidates)];
}

export function resolveCardImages(
  card: TcgdexCachedCard,
  lang: CardLanguage,
  set?: TcgdexCachedSet,
): { small: string; large: string; fallbacks: string[] } {
  const bases = buildImageCandidates(card, lang, set);
  const fallbacks: string[] = [];

  for (const base of bases) {
    fallbacks.push(`${base}/high.webp`, `${base}/low.webp`);
  }

  const unique = [...new Set(fallbacks.filter(Boolean))];

  return {
    large: unique[0] ?? "",
    small: unique[1] ?? unique[0] ?? "",
    fallbacks: unique,
  };
}

export function tcgCardFromCached(
  card: TcgdexCachedCard,
  setName: string,
  lang: CardLanguage = DEFAULT_LANGUAGE,
  set?: TcgdexCachedSet,
): TcgCard {
  const resolved = resolveCardImages(card, lang, set);
  const officialTotal = set?.cardCount?.official;

  return {
    id: card.id,
    name: card.name,
    number: card.localId,
    rarity: card.rarity,
    types: card.types,
    category: card.category,
    set: { id: card.setId, name: setName },
    setCode: getSetCollectorCode(card.setId),
    collectorId: formatCollectorCardId(
      card.setId,
      card.localId,
      officialTotal,
    ),
    images: {
      small: resolved.small,
      large: resolved.large,
    },
    imageFallbacks: resolved.fallbacks,
    cardmarket: card.pricing?.trend
      ? {
          prices: {
            trendPrice: card.pricing.trend,
            averageSellPrice: card.pricing.avg,
            lowPrice: card.pricing.low,
          },
        }
      : undefined,
  };
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function cacheStamp(file: { updatedAt: string; pricesUpdatedAt?: string }): string {
  return file.pricesUpdatedAt ?? file.updatedAt;
}

export function loadCachedCards(lang: CardLanguage): TcgdexCachedCard[] | null {
  const file = readJsonFile<CardsCacheFile>(
    path.join(DATA_DIR, "cards", `${lang}.json`),
  );
  if (!file?.cards?.length) return null;

  const stamp = cacheStamp(file);
  const cached = cacheMem.cards.get(lang);
  if (cached && cached.stamp === stamp) return cached.data;

  cacheMem.cards.set(lang, { stamp, data: file.cards });
  return file.cards;
}

export function loadCachedSets(lang: CardLanguage): TcgdexCachedSet[] | null {
  const file = readJsonFile<SetsCacheFile>(
    path.join(DATA_DIR, "sets", `${lang}.json`),
  );
  if (!file?.sets?.length) return null;

  const stamp = file.updatedAt;
  const cached = cacheMem.sets.get(lang);
  if (cached && cached.stamp === stamp) return cached.data;

  cacheMem.sets.set(lang, { stamp, data: file.sets });
  return file.sets;
}

function buildSetMaps(sets: TcgdexCachedSet[] | null) {
  const names = new Map<string, string>();
  const meta = new Map<string, TcgdexCachedSet>();
  const releaseOrder = new Map<string, number>();

  for (const [index, set] of (sets ?? []).entries()) {
    names.set(set.id, set.name);
    meta.set(set.id, set);
    const ts = set.releaseDate ? Date.parse(set.releaseDate) : NaN;
    releaseOrder.set(set.id, Number.isFinite(ts) ? ts : index);
  }

  return { names, meta, releaseOrder };
}

function compareCards(
  a: TcgdexCachedCard,
  b: TcgdexCachedCard,
  releaseOrder: Map<string, number>,
): number {
  const aHasImage = a.image ? 1 : 0;
  const bHasImage = b.image ? 1 : 0;
  if (bHasImage !== aHasImage) return bHasImage - aHasImage;

  const dateDiff =
    (releaseOrder.get(b.setId) ?? 0) - (releaseOrder.get(a.setId) ?? 0);
  if (dateDiff !== 0) return dateDiff;

  const localIdDiff = a.localId.localeCompare(b.localId, undefined, {
    numeric: true,
  });
  if (localIdDiff !== 0) return localIdDiff;

  return a.id.localeCompare(b.id);
}

function filterCachedCards(
  cards: TcgdexCachedCard[],
  params: {
    search?: string;
    setId?: string;
    rarity?: string;
    color?: string;
    lang?: CardLanguage;
  },
): TcgdexCachedCard[] {
  let result = cards;

  if (params.search?.trim()) {
    const term = params.search.trim().toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.localId.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        c.setId.toLowerCase().includes(term),
    );
  }

  if (params.setId) {
    result = result.filter((c) => c.setId === params.setId);
  }

  if (params.rarity && params.lang && !isAllRaritiesFilter(params.rarity)) {
    result = result.filter((card) =>
      cardMatchesEnglishRarity(card.rarity, params.rarity!, params.lang!),
    );
  }

  if (params.color && params.lang && !isAllColorsFilterValue(params.color, params.lang)) {
    result = result.filter((card) =>
      cardMatchesColor(card, params.color!, params.lang!),
    );
  }

  return result;
}

type TcgdexBriefCard = {
  id: string;
  localId: string;
  name: string;
  image?: string;
};

async function fetchLiveBriefCards(
  lang: CardLanguage,
  params: {
    page: number;
    pageSize: number;
    search?: string;
    setId?: string;
    rarity?: string;
    color?: string;
    lang: CardLanguage;
  },
): Promise<TcgdexBriefCard[]> {
  const url = new URL(`${TCGDEX_API}/${lang}/cards`);
  url.searchParams.set("pagination:page", String(params.page));
  url.searchParams.set("pagination:itemsPerPage", String(params.pageSize));
  if (params.search?.trim()) url.searchParams.set("name", params.search.trim());
  if (params.setId) url.searchParams.set("set.id", params.setId);
  if (params.rarity && !isAllRaritiesFilter(params.rarity)) {
    url.searchParams.set(
      "rarity",
      resolveRarityForApi(params.rarity, lang),
    );
  }
  if (params.color && params.lang && !isAllColorsFilterValue(params.color, params.lang)) {
    url.searchParams.set(
      "types",
      resolveColorForTcgdexApi(params.color, params.lang),
    );
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`TCGdex API error: ${res.status}`);
  }

  return res.json();
}

export async function fetchCardsFromTcgdex(params: {
  lang?: CardLanguage;
  page?: number;
  pageSize?: number;
  search?: string;
  setId?: string;
  rarity?: string;
  color?: string;
}): Promise<CardsResponse> {
  const lang = params.lang ?? DEFAULT_LANGUAGE;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 40;
  const rarity =
    params.rarity && !isAllRaritiesFilter(params.rarity)
      ? params.rarity
      : undefined;
  const color =
    params.color && !isAllColorsFilterValue(params.color, lang)
      ? params.color
      : undefined;

  const cached = loadCachedCards(lang);
  const cachedSets = loadCachedSets(lang);
  const { names: setNames, meta: setMeta, releaseOrder } =
    buildSetMaps(cachedSets);

  if (cached) {
    const filtered = filterCachedCards(cached, {
      search: params.search,
      setId: params.setId,
      rarity,
      color,
      lang,
    }).sort((a, b) => compareCards(a, b, releaseOrder));

    const start = (page - 1) * pageSize;
    const slice = filtered.slice(start, start + pageSize);

    return {
      data: slice.map((card) =>
        tcgCardFromCached(
          card,
          setNames.get(card.setId) ?? card.setId,
          lang,
          setMeta.get(card.setId),
        ),
      ),
      page,
      pageSize,
      totalCount: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    };
  }

  const brief = await fetchLiveBriefCards(lang, {
    page,
    pageSize,
    search: params.search,
    setId: params.setId,
    rarity,
    color,
    lang,
  });

  const setList: TcgdexCachedSet[] =
    cachedSets ??
    (await fetchSetsFromTcgdex(lang)).data.map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.images.logo,
      symbol: s.images.symbol,
      cardCount: { total: s.total },
    }));
  const liveMaps = buildSetMaps(setList);

  const data: TcgCard[] = brief.map((card) => {
    const setId = extractSetId(card.id);
    return tcgCardFromCached(
      {
        id: card.id,
        localId: card.localId,
        name: card.name,
        image: card.image,
        setId,
      },
      liveMaps.names.get(setId) ?? setId,
      lang,
      liveMaps.meta.get(setId),
    );
  });

  return {
    data,
    page,
    pageSize,
    totalCount:
      data.length < pageSize
        ? (page - 1) * pageSize + data.length
        : page * pageSize + 1,
    totalPages: data.length < pageSize ? page : page + 1,
  };
}

type TcgdexSeriesBrief = { id: string; name: string };

export async function loadSeriesNames(
  lang: CardLanguage,
): Promise<Map<string, string>> {
  const cached = cacheMem.series.get(lang);
  if (cached) return cached.data;

  const res = await fetch(`${TCGDEX_API}/${lang}/series`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`TCGdex API error: ${res.status}`);
  }

  const json = (await res.json()) as TcgdexSeriesBrief[];
  const map = new Map(json.map((serie) => [serie.id, serie.name]));
  cacheMem.series.set(lang, { stamp: new Date().toISOString(), data: map });
  return map;
}

export async function fetchSetsFromTcgdex(
  lang: CardLanguage = DEFAULT_LANGUAGE,
): Promise<{ data: TcgSet[]; totalCount: number }> {
  const seriesNames = await loadSeriesNames(lang);
  const cached = loadCachedSets(lang);
  if (cached) {
    const sorted = [...cached].sort((a, b) => {
      const aTs = a.releaseDate ? Date.parse(a.releaseDate) : 0;
      const bTs = b.releaseDate ? Date.parse(b.releaseDate) : 0;
      return bTs - aTs;
    });

    const data = sorted.map((set) => {
      const seriesId = set.serieId ?? "";
      const total = set.cardCount?.total ?? 0;
      const official = set.cardCount?.official ?? total;

      return {
        id: set.id,
        name: set.name,
        series: seriesNames.get(seriesId) ?? seriesId,
        seriesId,
        total,
        official,
        secretRareCount: Math.max(0, total - official),
        releaseDate: set.releaseDate ?? "",
        images: resolveSetImageUrls(set, lang),
      };
    });
    return { data, totalCount: data.length };
  }

  const res = await fetch(`${TCGDEX_API}/${lang}/sets`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`TCGdex API error: ${res.status}`);
  }

  const json: TcgdexCachedSet[] = await res.json();

  const data: TcgSet[] = json.map((set) => {
    const seriesId = set.serieId ?? "";
    const total = set.cardCount?.total ?? 0;
    const official = set.cardCount?.official ?? total;

    return {
      id: set.id,
      name: set.name,
      series: seriesNames.get(seriesId) ?? seriesId,
      seriesId,
      total,
      official,
      secretRareCount: Math.max(0, total - official),
      releaseDate: set.releaseDate ?? "",
      images: resolveSetImageUrls(set, lang),
    };
  });

  return { data, totalCount: data.length };
}

export function clearTcgdexCache(): void {
  cacheMem.cards.clear();
  cacheMem.sets.clear();
  cacheMem.series.clear();
}