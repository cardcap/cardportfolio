"use client";

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
    <button
      type="button"
      aria-pressed={inList}
      onClick={() => toggleItem(item)}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all ${
        inList
          ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-2 ring-[var(--accent)] shadow-[0_0_0_1px_var(--accent)] hover:brightness-110"
          : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
      } ${className}`}
    >
      {inList ? (
        <>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          ✓ Auf der Wunschliste
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          Zur Wunschliste hinzufügen
        </>
      )}
    </button>
  );
}