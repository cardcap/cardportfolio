/**
 * Sealed product images: real retail product photos (TCGPlayer CDN via catalog map).
 * Prefer product type match → set default product → soft branded placeholder.
 * Do not use set logos as product photos (they look wrong on sealed tiles).
 */

import type { TcgSet } from "@/lib/pokemon-tcg";
import sealedImageMap from "@/data/sealed-product-images.json";

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

type MappedProduct = {
  productId: number;
  name: string;
  imageUrl: string;
  imageFallbacks: string[];
};

type SetImageEntry = {
  groupId: number;
  groupName: string;
  products: Partial<Record<SealedProductType, MappedProduct>>;
  default?: MappedProduct;
};

const BY_SET = (sealedImageMap as { bySet: Record<string, SetImageEntry> })
  .bySet;

function mappedImages(
  setId: string,
  productType?: SealedProductType,
): SealedImageSet | null {
  const entry = BY_SET[setId];
  if (!entry) return null;

  const pick =
    (productType && entry.products[productType]) ||
    entry.default ||
    entry.products["Booster Display"] ||
    entry.products["Top-Trainer-Box"] ||
    Object.values(entry.products).find(Boolean);

  if (!pick) return null;

  // Cross-type fallbacks from same set (still real product photos)
  const extras: string[] = [];
  for (const p of Object.values(entry.products)) {
    if (!p || p.productId === pick.productId) continue;
    extras.push(p.imageUrl, ...(p.imageFallbacks ?? []));
  }

  const urls = [
    pick.imageUrl,
    ...(pick.imageFallbacks ?? []),
    ...extras,
  ].filter(Boolean);

  const unique = [...new Set(urls)];
  return {
    imageUrl: unique[0] ?? "",
    imageFallbacks: unique.slice(1),
  };
}

/**
 * Images for a sealed catalog product tied to a real TcgSet.
 */
export function buildSealedImagesFromSet(
  set: TcgSet,
  productType?: SealedProductType,
): SealedImageSet {
  const mapped = mappedImages(set.id, productType);
  if (mapped?.imageUrl) return mapped;

  // No product photo mapped yet — empty src → SealedProductImage shows gradient placeholder
  // (better than wrong set logo on a product tile)
  return { imageUrl: "", imageFallbacks: [] };
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
  sp7: { serie: "me", setId: "me04", type: "Booster Display" },
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

/** TCGdex set id for a demo sealed product (e.g. sp1 → sv07). */
export function getDemoSealedSetId(productId: string): string | null {
  return DEMO_SEALED_META[productId]?.setId ?? null;
}

export function getDemoSealedImages(productId: string): SealedImageSet {
  const meta = DEMO_SEALED_META[productId];
  if (!meta) {
    const keys = Object.keys(DEMO_SEALED_META);
    let h = 0;
    for (let i = 0; i < productId.length; i++)
      h = (h * 31 + productId.charCodeAt(i)) >>> 0;
    return getDemoSealedImages(keys[h % keys.length]);
  }

  const mapped = mappedImages(meta.setId, meta.type);
  if (mapped?.imageUrl) return mapped;

  const fakeSet = {
    id: meta.setId,
    name: meta.setId,
    series: meta.serie,
    seriesId: meta.serie,
    total: 100,
    releaseDate: "",
    images: {
      logo: "",
      symbol: "",
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
