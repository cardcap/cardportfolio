import type { Card } from "@/lib/mock-data";
import {
  getCardImageFallbacks,
  getCardImageUrl,
  getCardPrice,
  type TcgCard,
} from "@/lib/pokemon-tcg";

export type WishlistPriority = "Hoch" | "Mittel" | "Niedrig";
export type WishlistKind = "Karte" | "Sealed";

export type WishlistItem = {
  id: string;
  name: string;
  setName: string;
  imageUrl: string;
  imageFallbacks?: string[];
  price: number | null;
  rarity?: string;
  number?: string;
  /** Card vs sealed product */
  kind?: WishlistKind;
  language?: string;
  quantity?: number;
  priority?: WishlistPriority;
  /** Price alarm threshold (buy at or below) */
  alarmPrice?: number | null;
  /** Series label e.g. Karmesin & Purpur */
  series?: string;
};

export function wishlistItemFromTcg(card: TcgCard): WishlistItem {
  return {
    id: card.id,
    name: card.name,
    setName: card.set.name,
    imageUrl: getCardImageUrl(card),
    imageFallbacks: getCardImageFallbacks(card),
    price: getCardPrice(card),
    rarity: card.rarity,
    number: card.number,
    kind: "Karte",
    language: "DE",
    quantity: 1,
    priority: "Mittel",
    alarmPrice:
      getCardPrice(card) != null
        ? Math.round(getCardPrice(card)! * 0.85 * 100) / 100
        : null,
  };
}

export function wishlistItemFromMock(card: Card): WishlistItem {
  return {
    id: card.id,
    name: card.name,
    setName: card.setName,
    imageUrl: card.imageUrl,
    price: card.price,
    rarity: card.rarity,
    number: card.number,
    kind: "Karte",
    language: card.language?.slice(0, 2).toUpperCase() || "DE",
    quantity: 1,
    priority: "Mittel",
    alarmPrice: Math.round(card.price * 0.85 * 100) / 100,
  };
}

/** Enrich older wishlist entries missing new fields */
export function normalizeWishlistItem(item: WishlistItem): WishlistItem {
  const price = item.price;
  return {
    ...item,
    kind: item.kind ?? (item.id.startsWith("sealed") ? "Sealed" : "Karte"),
    language: item.language ?? "DE",
    quantity: item.quantity ?? 1,
    priority: item.priority ?? "Mittel",
    alarmPrice:
      item.alarmPrice !== undefined
        ? item.alarmPrice
        : price != null
          ? Math.round(price * 0.85 * 100) / 100
          : null,
  };
}

export function isPriceTargetReached(item: WishlistItem): boolean {
  if (item.price == null || item.alarmPrice == null) return false;
  return item.price <= item.alarmPrice;
}

export function demoChange(id: string): { abs: number; pct: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const pct = Math.round(((h % 120) / 10 - 6) * 10) / 10; // -6 … +6
  return { abs: Math.abs(pct) * 0.4, pct };
}

export function demoSparkline(id: string, price: number | null): number[] {
  const base = price ?? 50;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
  const pts: number[] = [];
  for (let i = 0; i < 12; i++) {
    const wave = Math.sin((h + i * 40) / 30) * base * 0.06;
    pts.push(base * (0.9 + i * 0.01) + wave);
  }
  return pts;
}
