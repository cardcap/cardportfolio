import "server-only";

import { getEffectiveCondition } from "@/lib/card-conditions";
import {
  getCachedCardById,
  getCachedSetById,
  loadCachedCards,
  loadCachedSets,
  resolveCardImages,
  type TcgdexCachedCard,
} from "@/lib/tcgdex";
import { DEFAULT_LANGUAGE, type CardLanguage } from "@/lib/tcgdex-constants";
import { prisma } from "@/lib/prisma";

/** Fast unit market price from catalog cache (no full TcgCard build). */
function unitPriceFromCached(
  card: TcgdexCachedCard | null,
  condition: string,
): number {
  if (!card?.pricing) return 0;
  const base = card.pricing.trend ?? card.pricing.avg ?? card.pricing.low ?? 0;
  if (!base) return 0;
  // Multipliers mirror getCardPriceForCondition / CONDITION_MULTIPLIERS
  const effective = getEffectiveCondition(condition);
  const mult: Record<string, number> = {
    Mint: 1.05,
    "Near Mint": 1,
    Excellent: 0.85,
    Good: 0.7,
    "Light Played": 0.55,
    Played: 0.4,
    Poor: 0.25,
    "PSA 10": 4,
    "PSA 9": 2.2,
    "PSA 8": 1.5,
    "PSA 7": 1.2,
    "PSA 6": 1,
  };
  const m = mult[effective] ?? 1;
  return Math.round(base * m * 100) / 100;
}

export type CollectionExemplarDto = {
  condition: string;
  purchasePrice: number | null;
  purchaseDate?: string | null;
};

export type CollectionItemDto = {
  id: string;
  tcgCardId: string;
  name: string;
  setId: string;
  setName: string;
  number: string;
  imageUrl: string;
  imageFallbacks: string[];
  rarity: string | null;
  colors: string[];
  types: string[];
  category?: string;
  language: string;
  condition: string;
  quantity: number;
  purchasePrice: number | null;
  purchaseDate: string | null;
  marketValue: number;
  profit: number | null;
  origin?: string | null;
  exemplars?: CollectionExemplarDto[];
};

export type CollectionMetrics = {
  totalCards: number;
  uniqueCards: number;
  duplicates: number;
  totalValue: number;
  invested: number;
  profitLoss: number;
};

function findCachedCard(
  lang: CardLanguage,
  tcgCardId: string,
): TcgdexCachedCard | null {
  return getCachedCardById(lang, tcgCardId);
}

function parseExemplars(raw: unknown): CollectionExemplarDto[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    return raw.map((e) => {
      const row = e as CollectionExemplarDto;
      return {
        condition: row.condition || "Near Mint",
        purchasePrice:
          row.purchasePrice === undefined || row.purchasePrice === null
            ? null
            : Number(row.purchasePrice),
        purchaseDate: row.purchaseDate ?? null,
      };
    });
  }
  return undefined;
}

function enrichItem(
  item: {
    id: string;
    tcgCardId: string;
    name: string;
    setId: string;
    setName: string;
    number: string;
    imageUrl: string;
    imageFallbacks: string | null;
    rarity: string | null;
    language: string;
    condition: string;
    quantity: number;
    purchasePrice: number | null;
    purchaseDate: string | null;
    origin?: string | null;
    exemplars?: unknown;
  },
  cachedCard: TcgdexCachedCard | null,
  setName: string,
  lang: CardLanguage,
): CollectionItemDto {
  // Fast path: pricing from catalog JSON fields (no full card object build)
  const unitPrice = unitPriceFromCached(cachedCard, item.condition);
  const marketValue = Math.round(unitPrice * item.quantity * 100) / 100;

  const exemplars = parseExemplars(item.exemplars);
  const investedFromExemplars =
    exemplars && exemplars.length > 0
      ? exemplars.reduce((s, e) => s + (e.purchasePrice ?? 0), 0)
      : null;

  const invested =
    investedFromExemplars != null
      ? Math.round(investedFromExemplars * 100) / 100
      : item.purchasePrice != null
        ? Math.round(item.purchasePrice * item.quantity * 100) / 100
        : null;

  const profit =
    invested != null ? Math.round((marketValue - invested) * 100) / 100 : null;

  let imageUrl = item.imageUrl;
  let imageFallbacks: string[] = [];
  if (item.imageFallbacks) {
    try {
      imageFallbacks = JSON.parse(item.imageFallbacks) as string[];
    } catch {
      imageFallbacks = [];
    }
  }

  // Prefer stored snapshot images; only resolve from catalog when missing
  if (cachedCard && (!imageUrl || imageFallbacks.length === 0)) {
    const setMeta = getCachedSetById(lang, cachedCard.setId);
    const images = resolveCardImages(
      cachedCard,
      lang,
      setMeta ?? undefined,
    );
    if (!imageUrl) imageUrl = images.large || images.small || imageUrl;
    if (imageFallbacks.length === 0 && images.fallbacks.length) {
      imageFallbacks = images.fallbacks;
    }
  }

  const purchasePrice =
    exemplars && exemplars.length > 0 && item.quantity > 0
      ? Math.round(
          (exemplars.reduce((s, e) => s + (e.purchasePrice ?? 0), 0) /
            item.quantity) *
            100,
        ) / 100
      : item.purchasePrice;

  // types double as glow colors in the list UI — skip heavy getCardColors()
  const types = cachedCard?.types ?? [];

  return {
    id: item.id,
    tcgCardId: item.tcgCardId,
    name: item.name,
    setId: item.setId,
    setName: item.setName || setName,
    number: item.number,
    imageUrl,
    imageFallbacks,
    rarity: item.rarity,
    colors: types,
    types,
    category: cachedCard?.category,
    language: item.language,
    condition: item.condition,
    quantity: item.quantity,
    purchasePrice,
    purchaseDate: item.purchaseDate,
    marketValue,
    profit,
    origin: item.origin ?? null,
    exemplars,
  };
}

export async function getUserCollection(userId: string): Promise<{
  items: CollectionItemDto[];
  metrics: CollectionMetrics;
}> {
  const rows = await prisma.collectionItem.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  // Warm catalog cache once per language (not per row)
  const langs = new Set(
    rows.map((r) => (r.language as CardLanguage) || DEFAULT_LANGUAGE),
  );
  for (const lang of langs) {
    loadCachedCards(lang);
    loadCachedSets(lang);
  }

  const items = rows.map((row) => {
    const lang = (row.language as CardLanguage) || DEFAULT_LANGUAGE;
    const cachedCard = getCachedCardById(lang, row.tcgCardId);
    const setName =
      getCachedSetById(lang, row.setId)?.name ?? row.setName;

    return enrichItem(row, cachedCard, setName, lang);
  });

  const totalCards = items.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCards = items.length;
  const duplicates = Math.max(0, totalCards - uniqueCards);
  const totalValue = items.reduce((sum, item) => sum + item.marketValue, 0);
  const invested = items.reduce(
    (sum, item) => sum + (item.purchasePrice ?? 0) * item.quantity,
    0,
  );
  const profitLoss = totalValue - invested;

  return {
    items,
    metrics: {
      totalCards,
      uniqueCards,
      duplicates,
      totalValue: Math.round(totalValue * 100) / 100,
      invested: Math.round(invested * 100) / 100,
      profitLoss: Math.round(profitLoss * 100) / 100,
    },
  };
}

export type ConfirmImportRow = {
  tcgCardId: string;
  quantity: number;
  condition: string;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  language: string;
};

export type AddCardParams = {
  tcgCardId: string;
  language?: CardLanguage;
  condition?: string;
  quantity?: number;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  origin?: string | null;
  exemplars?: CollectionExemplarDto[];
  /** Fallback when card is not in local TCGdex cache */
  snapshot?: {
    name: string;
    setId?: string;
    setName?: string;
    number?: string;
    imageUrl?: string;
    imageFallbacks?: string[];
    rarity?: string | null;
  };
};

export async function addCardToCollection(
  userId: string,
  params: AddCardParams,
): Promise<CollectionItemDto | null> {
  const lang = params.language ?? DEFAULT_LANGUAGE;
  const condition = params.condition?.trim() || "Near Mint";
  const quantity = Math.max(1, params.quantity ?? 1);
  const purchaseDate =
    params.purchaseDate ?? new Date().toISOString().slice(0, 10);

  const cachedSets = loadCachedSets(lang);
  const cachedCard = findCachedCard(lang, params.tcgCardId);

  if (!cachedCard && !params.snapshot) return null;

  const setId = cachedCard?.setId ?? params.snapshot?.setId ?? "";
  const setName =
    cachedSets?.find((set) => set.id === setId)?.name ??
    params.snapshot?.setName ??
    cachedCard?.setId ??
    setId;
  const setMeta = cachedSets?.find((set) => set.id === setId);
  const images = cachedCard
    ? resolveCardImages(cachedCard, lang, setMeta)
    : {
        large: params.snapshot?.imageUrl ?? "",
        small: params.snapshot?.imageUrl ?? "",
        fallbacks: params.snapshot?.imageFallbacks ?? [],
      };

  const name = cachedCard?.name ?? params.snapshot!.name;
  const number =
    cachedCard?.localId ?? params.snapshot?.number ?? params.tcgCardId;
  const rarity = cachedCard?.rarity ?? params.snapshot?.rarity ?? null;
  const imageUrl = images.large || images.small || params.snapshot?.imageUrl || "";
  const imageFallbacks = JSON.stringify(
    images.fallbacks?.length
      ? images.fallbacks
      : (params.snapshot?.imageFallbacks ?? []),
  );

  const newExemplars: CollectionExemplarDto[] =
    params.exemplars && params.exemplars.length > 0
      ? params.exemplars
      : Array.from({ length: quantity }, () => ({
          condition,
          purchasePrice:
            params.purchasePrice === undefined ? null : params.purchasePrice,
          purchaseDate,
        }));

  const existing = await prisma.collectionItem.findUnique({
    where: {
      userId_tcgCardId_condition: {
        userId,
        tcgCardId: params.tcgCardId,
        condition,
      },
    },
  });

  if (existing) {
    const prevEx = parseExemplars(existing.exemplars) ?? [];
    const mergedEx = [...prevEx, ...newExemplars];
    const nextQty = existing.quantity + quantity;
    const invested = mergedEx.reduce((s, e) => s + (e.purchasePrice ?? 0), 0);
    const avgEk =
      nextQty > 0 ? Math.round((invested / nextQty) * 100) / 100 : null;

    const updated = await prisma.collectionItem.update({
      where: { id: existing.id },
      data: {
        quantity: nextQty,
        purchasePrice: avgEk,
        purchaseDate: params.purchaseDate ?? existing.purchaseDate,
        origin: params.origin ?? existing.origin,
        exemplars: mergedEx,
      },
    });
    return enrichItem(updated, cachedCard, setName, lang);
  }

  const invested = newExemplars.reduce((s, e) => s + (e.purchasePrice ?? 0), 0);
  const avgEk =
    quantity > 0 ? Math.round((invested / quantity) * 100) / 100 : null;

  const created = await prisma.collectionItem.create({
    data: {
      userId,
      tcgCardId: params.tcgCardId,
      name,
      setId,
      setName,
      number,
      imageUrl,
      imageFallbacks,
      rarity,
      language: lang,
      condition,
      quantity,
      purchasePrice:
        params.purchasePrice !== undefined ? params.purchasePrice : avgEk,
      purchaseDate,
      origin: params.origin ?? null,
      exemplars: newExemplars,
    },
  });

  return enrichItem(created, cachedCard, setName, lang);
}

export async function updateCollectionItem(
  userId: string,
  id: string,
  patch: {
    quantity?: number;
    condition?: string;
    purchasePrice?: number | null;
    purchaseDate?: string | null;
  },
): Promise<CollectionItemDto | null> {
  const existing = await prisma.collectionItem.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const nextCondition = patch.condition?.trim() || existing.condition;
  const nextQuantity =
    patch.quantity !== undefined
      ? Math.max(1, Math.floor(patch.quantity))
      : existing.quantity;

  // Unique constraint on (userId, tcgCardId, condition) — avoid conflict
  if (nextCondition !== existing.condition) {
    const clash = await prisma.collectionItem.findUnique({
      where: {
        userId_tcgCardId_condition: {
          userId,
          tcgCardId: existing.tcgCardId,
          condition: nextCondition,
        },
      },
    });
    if (clash && clash.id !== existing.id) {
      // Merge into existing row with that condition
      await prisma.collectionItem.update({
        where: { id: clash.id },
        data: {
          quantity: clash.quantity + nextQuantity,
          purchasePrice:
            patch.purchasePrice !== undefined
              ? patch.purchasePrice
              : clash.purchasePrice,
          purchaseDate:
            patch.purchaseDate !== undefined
              ? patch.purchaseDate
              : clash.purchaseDate,
        },
      });
      await prisma.collectionItem.delete({ where: { id: existing.id } });
      const lang = (clash.language as CardLanguage) || DEFAULT_LANGUAGE;
      const cachedCard = findCachedCard(lang, clash.tcgCardId);
      if (!cachedCard) return null;
      const merged = await prisma.collectionItem.findUnique({
        where: { id: clash.id },
      });
      if (!merged) return null;
      return enrichItem(merged, cachedCard, merged.setName, lang);
    }
  }

  let nextExemplars:
    | CollectionExemplarDto[]
    | undefined = undefined;
  if (patch.purchaseDate !== undefined) {
    const currentEx = parseExemplars(existing.exemplars);
    if (currentEx && currentEx.length > 0) {
      nextExemplars = currentEx.map((e) => ({
        ...e,
        purchaseDate: patch.purchaseDate,
      }));
    }
  }

  const updated = await prisma.collectionItem.update({
    where: { id: existing.id },
    data: {
      quantity: nextQuantity,
      condition: nextCondition,
      purchasePrice:
        patch.purchasePrice !== undefined
          ? patch.purchasePrice
          : existing.purchasePrice,
      purchaseDate:
        patch.purchaseDate !== undefined
          ? patch.purchaseDate
          : existing.purchaseDate,
      ...(nextExemplars !== undefined
        ? { exemplars: nextExemplars as object }
        : {}),
    },
  });

  const lang = (updated.language as CardLanguage) || DEFAULT_LANGUAGE;
  const cachedCard = findCachedCard(lang, updated.tcgCardId);
  if (!cachedCard) {
    // Still return enriched with stored fields
    return {
      id: updated.id,
      tcgCardId: updated.tcgCardId,
      name: updated.name,
      setId: updated.setId,
      setName: updated.setName,
      number: updated.number,
      imageUrl: updated.imageUrl,
      imageFallbacks: updated.imageFallbacks
        ? (JSON.parse(updated.imageFallbacks) as string[])
        : [],
      rarity: updated.rarity,
      colors: [],
      types: [],
      language: updated.language,
      condition: updated.condition,
      quantity: updated.quantity,
      purchasePrice: updated.purchasePrice,
      purchaseDate: updated.purchaseDate,
      marketValue: 0,
      profit: null,
    };
  }
  return enrichItem(updated, cachedCard, updated.setName, lang);
}

export async function removeCollectionItem(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await prisma.collectionItem.findFirst({
    where: { id, userId },
  });
  if (!existing) return false;
  await prisma.collectionItem.delete({ where: { id: existing.id } });
  return true;
}

export async function importCollectionRows(
  userId: string,
  rows: ConfirmImportRow[],
): Promise<{ imported: number; updated: number }> {
  let imported = 0;
  let updated = 0;

  for (const row of rows) {
    const lang = (row.language as CardLanguage) || DEFAULT_LANGUAGE;
    const cachedCard = findCachedCard(lang, row.tcgCardId);
    if (!cachedCard) continue;

    const setMeta = getCachedSetById(lang, cachedCard.setId);
    const setName = setMeta?.name ?? cachedCard.setId;
    const images = resolveCardImages(cachedCard, lang, setMeta ?? undefined);

    const existing = await prisma.collectionItem.findUnique({
      where: {
        userId_tcgCardId_condition: {
          userId,
          tcgCardId: row.tcgCardId,
          condition: row.condition,
        },
      },
    });

    if (existing) {
      await prisma.collectionItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + row.quantity,
          purchasePrice: row.purchasePrice ?? existing.purchasePrice,
          purchaseDate: row.purchaseDate ?? existing.purchaseDate,
        },
      });
      updated++;
      continue;
    }

    await prisma.collectionItem.create({
      data: {
        userId,
        tcgCardId: row.tcgCardId,
        name: cachedCard.name,
        setId: cachedCard.setId,
        setName,
        number: cachedCard.localId,
        imageUrl: images.large || images.small || "",
        imageFallbacks: JSON.stringify(images.fallbacks),
        rarity: cachedCard.rarity ?? null,
        language: lang,
        condition: row.condition,
        quantity: row.quantity,
        purchasePrice: row.purchasePrice ?? null,
        purchaseDate: row.purchaseDate ?? null,
      },
    });
    imported++;
  }

  return { imported, updated };
}