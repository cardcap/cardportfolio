/**
 * High-quality set logo / symbol resolution.
 * Prefer language logo → EN logo → Pokémon TCG CDN → symbol (never use symbol as primary when a logo exists).
 */

import type { CardLanguage } from "@/lib/tcgdex-constants";

const ASSET_EXT = /\.(webp|png|jpg|jpeg|gif|svg)$/i;

export function normalizeAssetUrl(url: string | undefined | null): string {
  if (!url) return "";
  const trimmed = url.replace(/\/$/, "");
  if (!trimmed) return "";
  if (ASSET_EXT.test(trimmed)) return trimmed;
  return `${trimmed}.webp`;
}

/** TCGdex set id → images.pokemontcg.io set code */
export const POKEMONTCG_SET_CODES: Record<string, string> = {
  base1: "base1",
  base2: "base2",
  base3: "base3",
  base4: "base4",
  base5: "base5",
  base6: "base6",
  gym1: "gym1",
  gym2: "gym2",
  neo1: "neo1",
  neo2: "neo2",
  neo3: "neo3",
  neo4: "neo4",
  ecard1: "ecard1",
  ecard2: "ecard2",
  ecard3: "ecard3",
  ex1: "ex1",
  ex2: "ex2",
  ex3: "ex3",
  ex5: "ex5",
  ex6: "ex6",
  ex7: "ex7",
  ex8: "ex8",
  ex9: "ex9",
  ex10: "ex10",
  ex11: "ex11",
  ex12: "ex12",
  ex13: "ex13",
  ex14: "ex14",
  ex15: "ex15",
  ex16: "ex16",
  dp1: "dp1",
  dp2: "dp2",
  dp3: "dp3",
  dp4: "dp4",
  dp5: "dp5",
  dp6: "dp6",
  dp7: "dp7",
  pl1: "pl1",
  pl2: "pl2",
  pl3: "pl3",
  pl4: "pl4",
  hgss1: "hgss1",
  hgss2: "hgss2",
  hgss3: "hgss3",
  hgss4: "hgss4",
  col1: "col1",
  bw1: "bw1",
  bw2: "bw2",
  bw3: "bw3",
  bw4: "bw4",
  bw5: "bw5",
  bw6: "bw6",
  bw7: "bw7",
  bw8: "bw8",
  bw9: "bw9",
  bw10: "bw10",
  xy0: "xy0",
  xy1: "xy1",
  xy2: "xy2",
  xy3: "xy3",
  xy4: "xy4",
  xy5: "xy5",
  xy6: "xy6",
  xy7: "xy7",
  xy8: "xy8",
  xy9: "xy9",
  xy10: "xy10",
  xy11: "xy11",
  xy12: "xy12",
  g1: "g1",
  sm1: "sm1",
  sm2: "sm2",
  sm3: "sm3",
  sm3point5: "sm35",
  "sm3.5": "sm35",
  sm4: "sm4",
  sm5: "sm5",
  sm6: "sm6",
  sm7: "sm7",
  sm8: "sm8",
  sm9: "sm9",
  sm10: "sm10",
  sm11: "sm11",
  sm12: "sm12",
  sm115: "sm115",
  sma: "sma",
  swsh1: "swsh1",
  swsh2: "swsh2",
  swsh3: "swsh3",
  swsh4: "swsh4",
  "swsh4.5": "swsh45",
  swsh5: "swsh5",
  swsh6: "swsh6",
  swsh7: "swsh7",
  swsh8: "swsh8",
  swsh9: "swsh9",
  swsh10: "swsh10",
  swsh11: "swsh11",
  swsh12: "swsh12",
  "swsh12.5": "swsh12pt5",
  cel25: "cel25",
  pgo: "pgo",
  sv01: "sv1",
  sv1: "sv1",
  sv02: "sv2",
  sv2: "sv2",
  sv03: "sv3",
  sv3: "sv3",
  "sv03.5": "sv3pt5",
  sv04: "sv4",
  sv4: "sv4",
  "sv04.5": "sv4pt5",
  sv05: "sv5",
  sv5: "sv5",
  sv06: "sv6",
  sv6: "sv6",
  "sv06.5": "sv6pt5",
  sv07: "sv7",
  sv7: "sv7",
  sv08: "sv8",
  sv8: "sv8",
  "sv08.5": "sv8pt5",
  sv09: "sv9",
  sv9: "sv9",
  sv10: "sv10",
  me01: "me1",
  me02: "me2",
  "me02.5": "me2pt5",
};

export type SetImageSource = {
  logo?: string | null;
  symbol?: string | null;
  serieId?: string | null;
  id: string;
};

export type ResolvedSetImages = {
  logo: string;
  symbol: string;
  fallbacks: string[];
};

function ptcgLogo(setId: string): string[] {
  const code = POKEMONTCG_SET_CODES[setId] ?? setId;
  return [
    `https://images.pokemontcg.io/${code}/logo.png`,
    `https://images.pokemontcg.io/${setId}/logo.png`,
  ];
}

function tcgdexLogoUrls(serieId: string, setId: string, langs: string[]): string[] {
  if (!serieId || !setId) return [];
  const out: string[] = [];
  for (const lang of langs) {
    out.push(
      `https://assets.tcgdex.net/${lang}/${serieId}/${setId}/logo.webp`,
      `https://assets.tcgdex.net/${lang}/${serieId}/${setId}/logo.png`,
    );
  }
  return out;
}

/**
 * Build ordered logo candidates.
 * EN assets cover classic sets much better than DE (many DE /logo 404).
 * Never put symbol before real logos.
 */
export function resolveSetImageUrls(
  set: SetImageSource,
  lang: CardLanguage | string = "de",
): ResolvedSetImages {
  const serieId = set.serieId ?? "";
  const symbol =
    normalizeAssetUrl(set.symbol ?? "") ||
    (serieId
      ? `https://assets.tcgdex.net/univ/${serieId}/${set.id}/symbol.webp`
      : "");

  const candidates: string[] = [];

  // 1) Explicit logo — prefer if already EN or non-DE path (fewer 404s)
  if (set.logo) {
    const explicit = normalizeAssetUrl(set.logo);
    candidates.push(explicit);
    // Mirror language variants of the same logo path
    if (explicit.includes("/de/")) {
      candidates.push(explicit.replace("/de/", "/en/"));
    } else if (explicit.includes(`/${lang}/`) && lang !== "en") {
      candidates.push(explicit.replace(`/${lang}/`, "/en/"));
    }
  }

  // 2) Pokémon TCG CDN early (stable logos, high res)
  candidates.push(...ptcgLogo(set.id));

  // 3) TCGdex logos — EN first (classic / TCG Pocket coverage), then UI lang
  const langs = [...new Set(["en", lang, "de", "fr", "es", "it"])];
  candidates.push(...tcgdexLogoUrls(serieId, set.id, langs));

  // 4) Symbol only as last branding fallback
  if (symbol) candidates.push(symbol);

  const unique = [...new Set(candidates.filter(Boolean))];
  const logo = unique[0] ?? "";
  const fallbacks = unique.filter((u) => u !== logo);

  return { logo, symbol, fallbacks };
}
