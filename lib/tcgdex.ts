import "server-only";

import fs from "fs";
import path from "path";
import {
  cardMatchesColor,
  isAllColorsFilter as isAllColorsFilterValue,
  resolveColorForTcgdexApi,
} from "@/lib/card-colors";
import {
  formatCollectorCardId,
  getSetCollectorCode,
  getSetPrintedTotal,
} from "@/lib/collector-id";
import {
  cardMatchesEnglishRarity,
  isAllRaritiesFilter,
  resolveRarityForApi,
} from "@/lib/rarity-labels";
import type { CardsResponse, TcgCard, TcgSet } from "@/lib/pokemon-tcg";
import {
  normalizeAssetUrl,
  resolveSetImageUrls as resolveSetImagesShared,
} from "@/lib/set-images";
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

export function normalizeTcgdexAssetUrl(url: string): string {
  return normalizeAssetUrl(url);
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
  const serieId = extractSerieId(set) ?? set.serieId ?? "";
  return resolveSetImagesShared(
    {
      id: set.id,
      logo: set.logo,
      symbol: set.symbol,
      serieId,
    },
    lang,
  );
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
  const pathFor = (l: string) =>
    serieId
      ? `https://assets.tcgdex.net/${l}/${serieId}/${card.setId}/${card.localId}`
      : "";

  // Explicit image from cache (usually language-correct when present)
  if (card.image) {
    candidates.push(normalizeImageBase(card.image));
  }

  if (serieId) {
    // Older DE/FR/… sets often lack scans → prefer EN when no cache image
    if (card.image) {
      candidates.push(pathFor(lang));
      if (lang !== "en") candidates.push(pathFor("en"));
    } else if (lang !== "en") {
      candidates.push(pathFor("en"), pathFor(lang));
    } else {
      candidates.push(pathFor("en"));
    }
  }

  return [...new Set(candidates.filter(Boolean))];
}

/** Pokémon TCG API CDN — last-resort images when TCGdex assets 404 */
export function buildPokemonTcgImageUrls(
  setId: string,
  localId: string,
): string[] {
  if (!setId || !localId) return [];
  const normalized = /^\d+$/.test(localId)
    ? String(parseInt(localId, 10))
    : localId;
  return [
    `https://images.pokemontcg.io/${setId}/${normalized}_hires.png`,
    `https://images.pokemontcg.io/${setId}/${normalized}.png`,
  ];
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

  // Older / non-EN sets often have no TCGdex scan — use Pokémon TCG CDN
  fallbacks.push(...buildPokemonTcgImageUrls(card.setId, card.localId));

  const unique = [...new Set(fallbacks.filter(Boolean))];

  return {
    large: unique[0] ?? "",
    small: unique.find((u) => u.includes("/low.webp")) ?? unique[0] ?? "",
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

  // Include EN asset stamp so logo enrichment invalidates when EN updates
  const enFile =
    lang === "en"
      ? null
      : readJsonFile<SetsCacheFile>(path.join(DATA_DIR, "sets", "en.json"));
  const stamp = `${file.updatedAt}|${enFile?.updatedAt ?? ""}|assets-v2`;
  const cached = cacheMem.sets.get(lang);
  if (cached && cached.stamp === stamp) return cached.data;

  const enSets = enFile?.sets?.length ? enFile.sets : null;
  const data =
    lang === "en" || !enSets
      ? file.sets
      : enrichLocalizedSetsWithEnAssets(file.sets, enSets);

  cacheMem.sets.set(lang, { stamp, data });
  return data;
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

/** Parse free-text search: name and/or collector number e.g. "POR 12/88", "12/88", "025" */
function parseCardSearchTerm(raw: string): {
  term: string;
  code?: string;
  number?: string;
  total?: string;
} {
  const term = raw.trim().toLowerCase();
  // "POR 12/88" | "por12/88" | "SCR 025" | "12/175" | "12"
  const m = term.match(
    /^(?:([a-z0-9]{1,6})\s+)?(\d+[a-z]?)(?:\s*\/\s*(\d+))?$/i,
  );
  if (m) {
    return {
      term,
      code: m[1]?.toUpperCase(),
      number: m[2].replace(/^0+(\d)/, "$1"),
      total: m[3],
    };
  }
  // "POR-12" style
  const m2 = term.match(/^([a-z0-9]{1,6})[-\s]+(\d+[a-z]?)$/i);
  if (m2) {
    return {
      term,
      code: m2[1].toUpperCase(),
      number: m2[2].replace(/^0+(\d)/, "$1"),
    };
  }
  return { term };
}

function normalizeLocalId(localId: string): string {
  const t = localId.trim();
  if (/^\d+$/.test(t)) return String(parseInt(t, 10));
  return t.toLowerCase();
}

function cardMatchesSearch(
  card: TcgdexCachedCard,
  rawSearch: string,
  setMeta?: Map<string, TcgdexCachedSet>,
): boolean {
  const parsed = parseCardSearchTerm(rawSearch);
  const term = parsed.term;
  if (!term) return true;

  const name = card.name.toLowerCase();
  const local = card.localId.toLowerCase();
  const localNorm = normalizeLocalId(card.localId);
  const id = card.id.toLowerCase();
  const setId = card.setId.toLowerCase();

  // Name / id / set id substring
  if (
    name.includes(term) ||
    local.includes(term) ||
    id.includes(term) ||
    setId.includes(term)
  ) {
    return true;
  }

  // Collector number match: "12", "12/88", "POR 12/88"
  if (parsed.number) {
    const numMatch = localNorm === parsed.number.toLowerCase();
    if (!numMatch) return false;
    if (parsed.code) {
      const code = getSetCollectorCode(card.setId).toUpperCase();
      // also accept setId variants (sv07 / SV07)
      if (
        code !== parsed.code &&
        card.setId.toUpperCase() !== parsed.code &&
        card.setId.replace(".", "").toUpperCase() !== parsed.code
      ) {
        return false;
      }
    }
    if (parsed.total) {
      const official = setMeta?.get(card.setId)?.cardCount?.official;
      const printed = getSetPrintedTotal(card.setId);
      const total = official ?? printed;
      if (total != null && String(total) !== parsed.total) {
        return false;
      }
    }
    return true;
  }

  // Full collector id substring e.g. "por 12", "scr12/142"
  const collector = formatCollectorCardId(
    card.setId,
    card.localId,
    setMeta?.get(card.setId)?.cardCount?.official,
  ).toLowerCase();
  const compact = (s: string) => s.replace(/\s+/g, "");
  if (collector.includes(term) || compact(collector).includes(compact(term))) {
    return true;
  }

  return false;
}

function filterCachedCards(
  cards: TcgdexCachedCard[],
  params: {
    search?: string;
    setId?: string;
    rarity?: string;
    color?: string;
    lang?: CardLanguage;
    setMeta?: Map<string, TcgdexCachedSet>;
  },
): TcgdexCachedCard[] {
  let result = cards;

  if (params.setId) {
    result = result.filter((c) => c.setId === params.setId);
  }

  if (params.search?.trim()) {
    const raw = params.search.trim();
    result = result.filter((c) =>
      cardMatchesSearch(c, raw, params.setMeta),
    );
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
      setMeta,
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

/**
 * Keep localized names (DE/FR/…) but borrow EN logo/symbol when the
 * language catalog has none — DE classic sets often ship without logo fields.
 * Do NOT append EN-only sets: their names would appear in English.
 */
export function enrichLocalizedSetsWithEnAssets(
  primary: TcgdexCachedSet[],
  en: TcgdexCachedSet[] | null,
): TcgdexCachedSet[] {
  if (!en?.length) return primary;
  const enById = new Map(en.map((s) => [s.id, s]));
  return primary.map((set) => {
    const eng = enById.get(set.id);
    if (!eng) return set;
    return {
      ...set,
      // name / releaseDate / cardCount stay from localized catalog
      logo: set.logo || eng.logo,
      symbol: set.symbol || eng.symbol,
      serieId: set.serieId || eng.serieId,
    };
  });
}

function mapCachedSetsToTcg(
  sets: TcgdexCachedSet[],
  seriesNames: Map<string, string>,
  lang: CardLanguage,
): TcgSet[] {
  const sorted = [...sets].sort((a, b) => {
    const aTs = a.releaseDate ? Date.parse(a.releaseDate) : 0;
    const bTs = b.releaseDate ? Date.parse(b.releaseDate) : 0;
    return bTs - aTs;
  });

  return sorted.map((set) => {
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
}

export async function fetchSetsFromTcgdex(
  lang: CardLanguage = DEFAULT_LANGUAGE,
): Promise<{ data: TcgSet[]; totalCount: number }> {
  // Series names only from active UI language (never fall back to EN labels)
  const seriesNames = await loadSeriesNames(lang);

  // loadCachedSets already enriches logos from EN while keeping DE names
  const cached = loadCachedSets(lang);

  if (cached?.length) {
    const data = mapCachedSetsToTcg(cached, seriesNames, lang);
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
  const enAssets = lang === "en" ? null : loadCachedSets("en");
  const enriched =
    lang === "en" ? json : enrichLocalizedSetsWithEnAssets(json, enAssets);
  const data = mapCachedSetsToTcg(enriched, seriesNames, lang);
  return { data, totalCount: data.length };
}

export function clearTcgdexCache(): void {
  cacheMem.cards.clear();
  cacheMem.sets.clear();
  cacheMem.series.clear();
}