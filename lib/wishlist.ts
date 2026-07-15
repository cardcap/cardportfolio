import type { Card } from "@/lib/mock-data";
import {
  getCardImageFallbacks,
  getCardImageUrl,
  getCardPrice,
  type TcgCard,
} from "@/lib/pokemon-tcg";

export type WishlistItem = {
  id: string;
  name: string;
  setName: string;
  imageUrl: string;
  imageFallbacks?: string[];
  price: number | null;
  rarity?: string;
  number?: string;
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
  };
}