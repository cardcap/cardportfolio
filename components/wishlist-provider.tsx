"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { WishlistItem } from "@/lib/wishlist";

const STORAGE_KEY = "cardportfolio-wishlist";

type WishlistContextValue = {
  items: WishlistItem[];
  count: number;
  totalValue: number;
  isInWishlist: (id: string) => boolean;
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: WishlistItem) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored) as WishlistItem[]);
      }
    } catch {
      setItems([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const isInWishlist = useCallback(
    (id: string) => items.some((item) => item.id === id),
    [items],
  );

  const addItem = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleItem = useCallback(
    (item: WishlistItem) => {
      if (isInWishlist(item.id)) {
        removeItem(item.id);
      } else {
        addItem(item);
      }
    },
    [isInWishlist, removeItem, addItem],
  );

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + (item.price ?? 0), 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      totalValue,
      isInWishlist,
      addItem,
      removeItem,
      toggleItem,
    }),
    [items, totalValue, isInWishlist, addItem, removeItem, toggleItem],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
}