import "server-only";

import { getCardColors } from "@/lib/card-colors";
import { getCardPriceForCondition } from "@/lib/card-conditions";
import {
  loadCachedCards,
  loadCachedSets,
  resolveCardImages,
  tcgCardFromCached,
  type TcgdexCachedCard,
} from "@/lib/tcgdex";
import { DEFAULT_LANGUAGE, type CardLanguage } from "@/lib/tcgdex-constants";
import { prisma } from "@/lib/prisma";

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
  cards: TcgdexCachedCard[] | null,
  tcgCardId: string,
): TcgdexCachedCard | null {
  return cards?.find((card) => card.id === tcgCardId) ?? null;
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
  },
  cachedCard: TcgdexCachedCard | null,
  setName: string,
  lang: CardLanguage,
): CollectionItemDto {
  const tcgCard = cachedCard
    ? tcgCardFromCached(cachedCard, setName, lang)
    : null;

  const unitPrice =
    tcgCard != null
      ? getCardPriceForCondition(tcgCard, item.condition)
      : null;

  const marketValue =
    unitPrice != null ? Math.round(unitPrice * item.quantity * 100) / 100 : 0;

  const invested =
    item.purchasePrice != null
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

  if (cachedCard) {
    const sets = loadCachedSets(lang);
    const setMeta = sets?.find((set) => set.id === cachedCard.setId);
    const images = resolveCardImages(cachedCard, lang, setMeta);
    imageUrl = images.large || images.small || imageUrl;
    imageFallbacks = images.fallbacks.length ? images.fallbacks : imageFallbacks;
  }

  return {
    id: item.id,
    tcgCardId: item.tcgCardId,
    name: item.name,
    setId: item.setId,
    setName: item.setName,
    number: item.number,
    imageUrl,
    imageFallbacks,
    rarity: item.rarity,
    colors: cachedCard
      ? getCardColors(cachedCard, lang)
      : [],
    types: cachedCard?.types ?? [],
    category: cachedCard?.category,
    language: item.language,
    condition: item.condition,
    quantity: item.quantity,
    purchasePrice: item.purchasePrice,
    purchaseDate: item.purchaseDate,
    marketValue,
    profit,
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

  const items = rows.map((row) => {
    const lang = (row.language as CardLanguage) || DEFAULT_LANGUAGE;
    const cachedCards = loadCachedCards(lang);
    const cachedSets = loadCachedSets(lang);
    const cachedCard = findCachedCard(cachedCards, row.tcgCardId);
    const setName =
      cachedSets?.find((set) => set.id === row.setId)?.name ?? row.setName;

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

export async function addCardToCollection(
  userId: string,
  params: {
    tcgCardId: string;
    language?: CardLanguage;
    condition?: string;
    quantity?: number;
  },
): Promise<CollectionItemDto | null> {
  const lang = params.language ?? DEFAULT_LANGUAGE;
  const condition = params.condition?.trim() || "Near Mint";
  const quantity = Math.max(1, params.quantity ?? 1);

  const cachedCards = loadCachedCards(lang);
  const cachedSets = loadCachedSets(lang);
  const cachedCard = findCachedCard(cachedCards, params.tcgCardId);
  if (!cachedCard) return null;

  const setName =
    cachedSets?.find((set) => set.id === cachedCard.setId)?.name ??
    cachedCard.setId;
  const setMeta = cachedSets?.find((set) => set.id === cachedCard.setId);
  const images = resolveCardImages(cachedCard, lang, setMeta);

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
    const updated = await prisma.collectionItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
    return enrichItem(updated, cachedCard, setName, lang);
  }

  const created = await prisma.collectionItem.create({
    data: {
      userId,
      tcgCardId: params.tcgCardId,
      name: cachedCard.name,
      setId: cachedCard.setId,
      setName,
      number: cachedCard.localId,
      imageUrl: images.large || images.small || "",
      imageFallbacks: JSON.stringify(images.fallbacks),
      rarity: cachedCard.rarity ?? null,
      language: lang,
      condition,
      quantity,
    },
  });

  return enrichItem(created, cachedCard, setName, lang);
}

export async function importCollectionRows(
  userId: string,
  rows: ConfirmImportRow[],
): Promise<{ imported: number; updated: number }> {
  let imported = 0;
  let updated = 0;

  for (const row of rows) {
    const lang = (row.language as CardLanguage) || DEFAULT_LANGUAGE;
    const cachedCards = loadCachedCards(lang);
    const cachedSets = loadCachedSets(lang);
    const cachedCard = findCachedCard(cachedCards, row.tcgCardId);
    if (!cachedCard) continue;

    const setName =
      cachedSets?.find((set) => set.id === cachedCard.setId)?.name ??
      cachedCard.setId;
    const images = resolveCardImages(
      cachedCard,
      lang,
      cachedSets?.find((set) => set.id === cachedCard.setId),
    );

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