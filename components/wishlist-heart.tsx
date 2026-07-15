"use client";

import type { WishlistItem } from "@/lib/wishlist";
import { useWishlist } from "@/components/wishlist-provider";

type WishlistHeartProps = {
  item: WishlistItem;
  className?: string;
};

export function WishlistHeart({ item, className = "" }: WishlistHeartProps) {
  const { isInWishlist, toggleItem } = useWishlist();
  const active = isInWishlist(item.id);

  return (
    <button
      type="button"
      aria-label={
        active ? "Von Wunschliste entfernen" : "Zur Wunschliste hinzufügen"
      }
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleItem(item);
      }}
      className={`flex h-7 w-7 items-center justify-center rounded-full border bg-[var(--surface)]/90 shadow-sm backdrop-blur-sm transition-all hover:scale-105 ${
        active
          ? "border-[var(--accent)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-3.5 w-3.5"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 2}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );
}