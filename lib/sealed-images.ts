/**
 * Sealed product images: prefer real product photos (TCGPlayer CDN) when mapped,
 * otherwise high-res set logos (EN first) — never a wrong set / bare symbol.
 */

import type { TcgSet } from "@/lib/pokemon-tcg";
import {
  normalizeAssetUrl,
  POKEMONTCG_SET_CODES,
  resolveSetImageUrls,
} from "@/lib/set-images";

/** Keep in sync with sealed-catalog SealedProductType (avoid circular import) */
type SealedProductType =
  | "Booster Display"
  | "Top-Trainer-Box"
  | "Booster Bundle"
  | "Tin"
  | "Blister"
  | "Kollektion";

export type SealedImageSet = {
  imageUrl: string;
  imageFallbacks: string[];
};

/** TCGPlayer product IDs for common sealed SKUs (EN retail photos, 800px) */
const TCGPLAYER_SEALED: Partial<
  Record<string, Partial<Record<SealedProductType | "default", number>>>
> = {
  // Scarlet & Violet base
  sv01: {
    "Booster Display": 495000,
    "Top-Trainer-Box": 495001,
    default: 495000,
  },
  sv02: {
    "Booster Display": 501000,
    default: 501000,
  },
  sv03: {
    "Booster Display": 511234,
    "Top-Trainer-Box": 511235,
    default: 511234,
  },
  "sv03.5": {
    "Booster Display": 517172,
    "Top-Trainer-Box": 517173,
    "Booster Bundle": 517174,
    default: 517172,
  },
  sv04: {
    "Booster Display": 528000,
    default: 528000,
  },
  "sv04.5": {
    "Booster Display": 540080,
    "Top-Trainer-Box": 540081,
    default: 540080,
  },
  sv05: {
    "Booster Display": 540082,
    "Top-Trainer-Box": 540083,
    default: 540082,
  },
  sv06: {
    "Booster Display": 540084,
    default: 540084,
  },
  "sv06.5": {
    "Booster Display": 553680,
    "Top-Trainer-Box": 553681,
    default: 553680,
  },
  sv07: {
    "Booster Display": 553682,
    "Top-Trainer-Box": 553683,
    default: 553682,
  },
  sv08: {
    "Booster Display": 478138,
    "Top-Trainer-Box": 478139,
    default: 478138,
  },
};

function tcgplayerUrl(productId: number, size = 800): string {
  return `https://product-images.tcgplayer.com/fit-in/${size}x${size}/${productId}.jpg`;
}

function productIdsFor(
  setId: string,
  productType?: SealedProductType,
): number[] {
  const entry = TCGPLAYER_SEALED[setId];
  if (!entry) return [];
  const ids: number[] = [];
  if (productType && entry[productType]) ids.push(entry[productType]!);
  if (entry.default) ids.push(entry.default);
  for (const v of Object.values(entry)) {
    if (typeof v === "number" && !ids.includes(v)) ids.push(v);
  }
  return ids;
}

/**
 * Images for a sealed catalog product tied to a real TcgSet.
 */
export function buildSealedImagesFromSet(
  set: TcgSet,
  productType?: SealedProductType,
): SealedImageSet {
  const urls: string[] = [];

  // 1) Real product photos when we have TCGPlayer IDs for this set
  for (const id of productIdsFor(set.id, productType)) {
    urls.push(tcgplayerUrl(id, 800), tcgplayerUrl(id, 437));
  }

  // 2) High-res set logos (correct set branding)
  const resolved = resolveSetImageUrls(
    {
      id: set.id,
      logo: set.images?.logo,
      symbol: set.images?.symbol,
      serieId: set.seriesId,
    },
    "en",
  );
  if (resolved.logo) urls.push(resolved.logo);
  urls.push(...resolved.fallbacks);

  // 3) Featured card art as soft last resort (pack-style, high res)
  const serie = set.seriesId;
  if (serie) {
    urls.push(
      `https://assets.tcgdex.net/en/${serie}/${set.id}/1/high.webp`,
      `https://assets.tcgdex.net/en/${serie}/${set.id}/001/high.webp`,
      `https://assets.tcgdex.net/en/${serie}/${set.id}/2/high.webp`,
    );
  }

  const ptcg = POKEMONTCG_SET_CODES[set.id];
  if (ptcg) {
    urls.push(`https://images.pokemontcg.io/${ptcg}/1_hires.png`);
  }

  const unique = [...new Set(urls.map(normalizeAssetUrl).filter(Boolean))];
  return {
    imageUrl: unique[0] ?? "",
    imageFallbacks: unique.slice(1),
  };
}

/**
 * Demo inventory (Assets → Sealed): map product id → set + preferred type.
 */
const DEMO_SEALED_META: Record<
  string,
  { serie: string; setId: string; type: SealedProductType; ptcg?: string }
> = {
  sp1: { serie: "sv", setId: "sv07", type: "Booster Display", ptcg: "sv7" },
  sp2: { serie: "sv", setId: "sv04", type: "Top-Trainer-Box", ptcg: "sv4" },
  sp3: { serie: "sv", setId: "sv05", type: "Booster Bundle", ptcg: "sv5" },
  sp4: { serie: "sv", setId: "sv03.5", type: "Kollektion", ptcg: "sv3pt5" },
  sp5: { serie: "sv", setId: "sv06", type: "Tin", ptcg: "sv6" },
  sp6: { serie: "sv", setId: "sv02", type: "Blister", ptcg: "sv2" },
  sp7: { serie: "sv", setId: "sv08", type: "Booster Display", ptcg: "sv8" },
  sp8: {
    serie: "swsh",
    setId: "swsh12",
    type: "Booster Display",
    ptcg: "swsh12",
  },
  sp9: { serie: "sv", setId: "sv01", type: "Top-Trainer-Box", ptcg: "sv1" },
  sp10: {
    serie: "sv",
    setId: "sv06.5",
    type: "Booster Bundle",
    ptcg: "sv6pt5",
  },
  sp11: { serie: "sv", setId: "sv03", type: "Tin", ptcg: "sv3" },
  sp12: {
    serie: "swsh",
    setId: "swsh11",
    type: "Blister",
    ptcg: "swsh11",
  },
};

export function getDemoSealedImages(productId: string): SealedImageSet {
  const meta = DEMO_SEALED_META[productId];
  if (!meta) {
    const keys = Object.keys(DEMO_SEALED_META);
    let h = 0;
    for (let i = 0; i < productId.length; i++)
      h = (h * 31 + productId.charCodeAt(i)) >>> 0;
    return getDemoSealedImages(keys[h % keys.length]);
  }

  const fakeSet = {
    id: meta.setId,
    name: meta.setId,
    series: meta.serie,
    seriesId: meta.serie,
    total: 100,
    releaseDate: "",
    images: {
      logo: `https://assets.tcgdex.net/en/${meta.serie}/${meta.setId}/logo.webp`,
      symbol: `https://assets.tcgdex.net/univ/${meta.serie}/${meta.setId}/symbol.webp`,
      fallbacks: [],
    },
  } satisfies TcgSet;

  return buildSealedImagesFromSet(fakeSet, meta.type);
}

/** @deprecated use buildSealedImagesFromSet */
export function logoSet(
  serie: string,
  setId: string,
  _ptcg?: string,
): SealedImageSet {
  return getDemoSealedImages(
    Object.entries(DEMO_SEALED_META).find(
      ([, v]) => v.serie === serie && v.setId === setId,
    )?.[0] ?? "sp1",
  );
}
