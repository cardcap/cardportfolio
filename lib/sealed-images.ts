/**
 * Image helpers for sealed products (displays, ETBs, tins, …).
 * Uses TCGdex set logos / symbols + Pokémon TCG CDN as fallbacks.
 * Real box photos are not available via free APIs, so set branding
 * is the reliable visual for every product.
 */

import type { TcgSet } from "@/lib/pokemon-tcg";

const ASSET_EXT = /\.(webp|png|jpg|jpeg|gif|svg)$/i;

export function normalizeAssetUrl(url: string | undefined | null): string {
  if (!url) return "";
  const trimmed = url.replace(/\/$/, "");
  if (!trimmed) return "";
  if (ASSET_EXT.test(trimmed)) return trimmed;
  return `${trimmed}.webp`;
}

/** Map known set ids → Pokémon TCG API logo codes */
const POKEMONTCG_LOGO: Record<string, string> = {
  "sv01": "sv1",
  "sv02": "sv2",
  "sv03": "sv3",
  "sv03.5": "sv3pt5",
  "sv04": "sv4",
  "sv04.5": "sv4pt5",
  "sv05": "sv5",
  "sv06": "sv6",
  "sv06.5": "sv6pt5",
  "sv07": "sv7",
  "sv08": "sv8",
  "sv08.5": "sv8pt5",
  "sv09": "sv9",
  "sv10": "sv10",
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
};

export type SealedImageSet = {
  imageUrl: string;
  imageFallbacks: string[];
};

export function buildSealedImagesFromSet(set: TcgSet): SealedImageSet {
  const logo = normalizeAssetUrl(set.images?.logo);
  const symbol = normalizeAssetUrl(set.images?.symbol);
  const extras = (set.images?.fallbacks ?? []).map(normalizeAssetUrl).filter(Boolean);

  const serie = set.seriesId;
  const constructed: string[] = [];
  if (serie && set.id) {
    for (const lang of ["en", "de", "fr"] as const) {
      constructed.push(
        `https://assets.tcgdex.net/${lang}/${serie}/${set.id}/logo.webp`,
      );
    }
    constructed.push(
      `https://assets.tcgdex.net/univ/${serie}/${set.id}/symbol.webp`,
    );
  }

  const ptcgCode = POKEMONTCG_LOGO[set.id];
  if (ptcgCode) {
    constructed.push(`https://images.pokemontcg.io/${ptcgCode}/logo.png`);
  }

  // First-card art as last visual fallback (pack-style)
  if (serie && set.id) {
    constructed.push(
      `https://assets.tcgdex.net/en/${serie}/${set.id}/1/high.webp`,
      `https://assets.tcgdex.net/en/${serie}/${set.id}/001/high.webp`,
    );
  }

  const all = [logo, symbol, ...extras, ...constructed].filter(Boolean);
  const unique = [...new Set(all)];

  return {
    imageUrl: unique[0] ?? "",
    imageFallbacks: unique.slice(1),
  };
}

/**
 * Static image set for demo inventory products that aren't tied to live TcgSet.
 * Keys are stable product ids (sp1, sp2, …).
 */
export const DEMO_SEALED_IMAGES: Record<string, SealedImageSet> = {
  sp1: logoSet("sv", "sv07", "sv7"), // Stellarkrone-ish
  sp2: logoSet("sv", "sv04", "sv4"),
  sp3: logoSet("sv", "sv05", "sv5"),
  sp4: logoSet("sv", "sv03.5", "sv3pt5"),
  sp5: logoSet("sv", "sv06", "sv6"),
  sp6: logoSet("sv", "sv02", "sv2"),
  sp7: logoSet("sv", "sv08", "sv8"),
  sp8: logoSet("swsh", "swsh12", "swsh12"),
  sp9: logoSet("sv", "sv01", "sv1"),
  sp10: logoSet("sv", "sv06.5", "sv6pt5"),
  sp11: logoSet("sv", "sv03", "sv3"),
  sp12: logoSet("swsh", "swsh11", "swsh11"),
};

function logoSet(
  serie: string,
  setId: string,
  ptcg?: string,
): SealedImageSet {
  const urls = [
    `https://assets.tcgdex.net/en/${serie}/${setId}/logo.webp`,
    `https://assets.tcgdex.net/de/${serie}/${setId}/logo.webp`,
    `https://assets.tcgdex.net/univ/${serie}/${setId}/symbol.webp`,
    ptcg ? `https://images.pokemontcg.io/${ptcg}/logo.png` : "",
    `https://assets.tcgdex.net/en/${serie}/${setId}/1/high.webp`,
  ].filter(Boolean);

  return {
    imageUrl: urls[0],
    imageFallbacks: urls.slice(1),
  };
}

export function getDemoSealedImages(productId: string): SealedImageSet {
  if (DEMO_SEALED_IMAGES[productId]) return DEMO_SEALED_IMAGES[productId];
  // Cycle through demo set for unknown ids
  const keys = Object.keys(DEMO_SEALED_IMAGES);
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = (h * 31 + productId.charCodeAt(i)) >>> 0;
  return DEMO_SEALED_IMAGES[keys[h % keys.length]];
}
