"use client";

import { Button } from "@/components/ui/button";
import type { WishlistItem } from "@/lib/wishlist";
import { useWishlist } from "@/components/wishlist-provider";

type WishlistButtonProps = {
  item: WishlistItem;
  className?: string;
};

export function WishlistButton({ item, className = "" }: WishlistButtonProps) {
  const { isInWishlist, toggleItem } = useWishlist();
  const inList = isInWishlist(item.id);

  return (
    <Button
      variant={inList ? "primary" : "secondary"}
      className={`w-full ${className}`}
      onClick={() => toggleItem(item)}
    >
      {inList ? "✓ Auf der Wunschliste" : "Zur Wunschliste hinzufügen"}
    </Button>
  );
}