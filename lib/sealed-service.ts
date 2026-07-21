import "server-only";

import { getDemoSealedSetId } from "@/lib/sealed-images";
import { prisma } from "@/lib/prisma";

export type SealedItemDto = {
  id: string;
  productKey: string;
  name: string;
  setId: string | null;
  setName: string;
  category: string;
  language: string;
  condition: string;
  quantity: number;
  purchasePrice: number;
  /** ISO yyyy-mm-dd */
  purchaseDate?: string | null;
  marketValue: number;
  imageUrl?: string;
  imageFallbacks?: string[];
  ean?: string;
};

export type SealedMetricsDto = {
  productCount: number;
  totalValue: number;
  invested: number;
  profitLoss: number;
  returnRate: number;
  sets: number;
  avgValue: number;
  totalUnits: number;
  weeklyChange: number;
  pricesUpdatedLabel: string;
};

function parseFallbacks(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function toDto(row: {
  id: string;
  productKey: string;
  name: string;
  setId: string | null;
  setName: string;
  category: string;
  language: string;
  condition: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate?: string | null;
  marketValue: number | null;
  imageUrl: string | null;
  imageFallbacks: string | null;
  ean: string | null;
}): SealedItemDto {
  return {
    id: row.id,
    productKey: row.productKey,
    name: row.name,
    setId: row.setId,
    setName: row.setName,
    category: row.category,
    language: row.language,
    condition: row.condition,
    quantity: row.quantity,
    purchasePrice: row.purchasePrice,
    purchaseDate: row.purchaseDate ?? null,
    marketValue: row.marketValue ?? row.purchasePrice,
    imageUrl: row.imageUrl ?? undefined,
    imageFallbacks: parseFallbacks(row.imageFallbacks),
    ean: row.ean ?? undefined,
  };
}

export function computeSealedMetrics(
  items: SealedItemDto[],
): SealedMetricsDto {
  const productCount = items.length;
  const totalUnits = items.reduce((s, p) => s + p.quantity, 0);
  const totalValue = items.reduce(
    (s, p) => s + p.marketValue * p.quantity,
    0,
  );
  const invested = items.reduce(
    (s, p) => s + p.purchasePrice * p.quantity,
    0,
  );
  const profitLoss = totalValue - invested;
  const sets = new Set(items.map((p) => p.setName)).size;
  const avgValue = productCount > 0 ? totalValue / productCount : 0;
  const returnRate = invested > 0 ? (profitLoss / invested) * 100 : 0;

  return {
    productCount,
    totalValue: Math.round(totalValue * 100) / 100,
    invested: Math.round(invested * 100) / 100,
    profitLoss: Math.round(profitLoss * 100) / 100,
    returnRate: Math.round(returnRate * 10) / 10,
    sets,
    avgValue: Math.round(avgValue * 100) / 100,
    totalUnits,
    weeklyChange: 0,
    pricesUpdatedLabel: "heute, 06:00 Uhr",
  };
}

export async function getUserSealed(userId: string): Promise<{
  items: SealedItemDto[];
  metrics: SealedMetricsDto;
}> {
  const rows = await prisma.sealedItem.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  const items = rows.map(toDto);
  return { items, metrics: computeSealedMetrics(items) };
}

export type CreateSealedParams = {
  productKey: string;
  name: string;
  setId?: string | null;
  setName: string;
  category: string;
  language?: string;
  condition?: string;
  quantity?: number;
  purchasePrice: number;
  /** ISO yyyy-mm-dd */
  purchaseDate?: string | null;
  marketValue?: number | null;
  imageUrl?: string | null;
  imageFallbacks?: string[] | null;
  ean?: string | null;
};

export async function addSealedItem(
  userId: string,
  params: CreateSealedParams,
): Promise<SealedItemDto> {
  const quantity = Math.max(1, params.quantity ?? 1);
  const condition = params.condition?.trim() || "OVP";
  const language = params.language?.trim() || "DE";
  const setId =
    params.setId ?? getDemoSealedSetId(params.productKey) ?? null;

  // Merge same productKey + condition + language
  const existing = await prisma.sealedItem.findFirst({
    where: {
      userId,
      productKey: params.productKey,
      condition,
      language,
    },
  });

  if (existing) {
    const updated = await prisma.sealedItem.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + quantity,
        purchasePrice: params.purchasePrice,
        marketValue: params.marketValue ?? existing.marketValue,
      },
    });
    return toDto(updated);
  }

  const created = await prisma.sealedItem.create({
    data: {
      userId,
      productKey: params.productKey,
      name: params.name,
      setId,
      setName: params.setName,
      category: params.category,
      language,
      condition,
      quantity,
      purchasePrice: params.purchasePrice,
      purchaseDate:
        params.purchaseDate?.trim() ||
        new Date().toISOString().slice(0, 10),
      marketValue: params.marketValue ?? params.purchasePrice,
      imageUrl: params.imageUrl ?? null,
      imageFallbacks: params.imageFallbacks
        ? JSON.stringify(params.imageFallbacks)
        : null,
      ean: params.ean ?? null,
    },
  });
  return toDto(created);
}

export async function updateSealedItem(
  userId: string,
  id: string,
  patch: {
    quantity?: number;
    condition?: string;
    language?: string;
    category?: string;
    purchasePrice?: number;
    purchaseDate?: string | null;
    marketValue?: number | null;
  },
): Promise<SealedItemDto | null> {
  const existing = await prisma.sealedItem.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const updated = await prisma.sealedItem.update({
    where: { id },
    data: {
      quantity:
        patch.quantity !== undefined
          ? Math.max(1, Math.floor(patch.quantity))
          : undefined,
      condition: patch.condition?.trim() || undefined,
      language: patch.language?.trim() || undefined,
      category: patch.category?.trim() || undefined,
      purchasePrice: patch.purchasePrice,
      purchaseDate:
        patch.purchaseDate !== undefined ? patch.purchaseDate : undefined,
      marketValue: patch.marketValue,
    },
  });
  return toDto(updated);
}

/** Remove sealed row entirely (after opening the whole line). */
export async function removeSealedItem(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await prisma.sealedItem.findFirst({
    where: { id, userId },
  });
  if (!existing) return false;
  await prisma.sealedItem.delete({ where: { id } });
  return true;
}

/**
 * Open one unit: qty>1 → decrement, qty===1 → delete.
 * Returns remaining inventory items for the user.
 */
export async function openSealedUnit(
  userId: string,
  id: string,
): Promise<SealedItemDto[]> {
  const existing = await prisma.sealedItem.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return (await getUserSealed(userId)).items;
  }

  if (existing.quantity > 1) {
    await prisma.sealedItem.update({
      where: { id },
      data: { quantity: existing.quantity - 1 },
    });
  } else {
    await prisma.sealedItem.delete({ where: { id } });
  }

  return (await getUserSealed(userId)).items;
}

/** Seed demo catalog products into a new user's inventory (once). */
export async function seedDemoSealedIfEmpty(
  userId: string,
  demoProducts: CreateSealedParams[],
): Promise<SealedItemDto[]> {
  const count = await prisma.sealedItem.count({ where: { userId } });
  if (count > 0) {
    return (await getUserSealed(userId)).items;
  }

  for (const p of demoProducts) {
    await addSealedItem(userId, p);
  }
  return (await getUserSealed(userId)).items;
}
