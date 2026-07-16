"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCard, sealedProducts } from "@/lib/mock-data";
import {
  normalizeWishlistItem,
  type WishlistItem,
  wishlistItemFromMock,
} from "@/lib/wishlist";

const STORAGE_KEY = "cardcap-wishlist";
const STORAGE_KEY_LEGACY = "cardportfolio-wishlist";
const SEEDED_KEY = "cardcap-wishlist-seeded-v4";

type WishlistContextValue = {
  items: WishlistItem[];
  count: number;
  totalValue: number;
  isInWishlist: (id: string) => boolean;
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: WishlistItem) => void;
  updateItem: (id: string, patch: Partial<WishlistItem>) => void;
  ready: boolean;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

/** Demo seed matching Wunschliste mockup (~12 items, 2 price targets). */
function buildDemoWishlist(): WishlistItem[] {
  type CardSeed = {
    id: string;
    priority: "Hoch" | "Mittel" | "Niedrig";
    alarm: number | null;
    lang: string;
    forcePrice?: number;
    forceReached?: boolean;
    name?: string;
    setName?: string;
    number?: string;
    rarity?: string;
    series?: string;
  };

  const cardSeeds: CardSeed[] = [
    {
      id: "pikachu-151",
      priority: "Hoch",
      alarm: 75,
      lang: "DE",
      forcePrice: 89.9,
      name: "Pikachu",
      setName: "Karmesin & Purpur – 151",
      number: "025/165",
      rarity: "Illustration Rare",
      series: "Karmesin & Purpur",
    },
    {
      id: "charizard-ex",
      priority: "Hoch",
      alarm: 120,
      lang: "DE",
      forcePrice: 132.5,
      name: "Glurak ex",
      setName: "Paradoxrift",
      number: "241/182",
      rarity: "Special Illustration Rare",
      series: "Karmesin & Purpur",
    },
    {
      id: "giratina-v",
      priority: "Mittel",
      alarm: null,
      lang: "EN",
      forcePrice: 45,
      forceReached: true,
      name: "Gengar",
      setName: "Fusion Strike",
      number: "TG06/TG30",
      rarity: "Trainer Gallery",
      series: "Schwert & Schild",
    },
    {
      id: "mew-ex",
      priority: "Mittel",
      alarm: 60,
      lang: "JP",
      forcePrice: 68,
      name: "Mew ex",
      setName: "Karmesin & Purpur – 151",
      number: "205/165",
      rarity: "Special Illustration Rare",
      series: "Karmesin & Purpur",
    },
    {
      id: "umbreon-v",
      priority: "Hoch",
      alarm: 80,
      lang: "DE",
      forcePrice: 95,
      series: "Schwert & Schild",
    },
    {
      id: "lugia-v",
      priority: "Mittel",
      alarm: null,
      lang: "EN",
      forcePrice: 100,
      series: "Schwert & Schild",
    },
    {
      id: "gardevoir-ex",
      priority: "Niedrig",
      alarm: null,
      lang: "DE",
      forcePrice: 64,
      series: "Karmesin & Purpur",
    },
    {
      id: "koraidon-ex",
      priority: "Mittel",
      alarm: null,
      lang: "DE",
      forcePrice: 38,
      series: "Karmesin & Purpur",
    },
  ];

  const fromCards: WishlistItem[] = cardSeeds.map((c) => {
    const card = getCard(c.id);
    const base = wishlistItemFromMock(card);
    const price = c.forcePrice ?? base.price;
    return {
      ...base,
      name: c.name ?? base.name,
      setName: c.setName ?? base.setName,
      number: c.number ?? base.number,
      rarity: c.rarity ?? base.rarity,
      price,
      language: c.lang,
      priority: c.priority,
      alarmPrice: c.forceReached
        ? (price ?? 0) + 5
        : c.alarm,
      quantity: 1,
      kind: "Karte" as const,
      series: c.series ?? c.setName ?? card.setName,
    };
  });

  const sealedSeeds: Array<{
    name: string;
    category: string;
    price: number;
    alarm: number | null;
    priority: "Hoch" | "Mittel" | "Niedrig";
    lang: string;
    reached?: boolean;
    series: string;
  }> = [
    {
      name: "Prismatische Entwicklungen",
      category: "Top-Trainer-Box",
      price: 59.9,
      alarm: null,
      priority: "Mittel",
      lang: "DE",
      reached: true,
      series: "Karmesin & Purpur",
    },
    {
      name: "Stellarkrone",
      category: "Booster Display",
      price: 64.3,
      alarm: 60,
      priority: "Niedrig",
      lang: "DE",
      series: "Karmesin & Purpur",
    },
    {
      name: "Nebula Guardians",
      category: "Elite Trainer Box",
      price: 54.0,
      alarm: null,
      priority: "Mittel",
      lang: "EN",
      series: "Karmesin & Purpur",
    },
    {
      name: "Chrono Rift",
      category: "Booster Bundle",
      price: 36.0,
      alarm: null,
      priority: "Niedrig",
      lang: "DE",
      series: "Karmesin & Purpur",
    },
  ];

  const sealed: WishlistItem[] = sealedSeeds.map((p, i) => {
    const product = sealedProducts[i];
    return {
      id: `wl-sealed-${product?.id ?? i}`,
      name: p.name,
      setName: p.category,
      imageUrl: product?.imageUrl ?? "",
      imageFallbacks: product?.imageFallbacks,
      price: p.price,
      kind: "Sealed" as const,
      language: p.lang,
      quantity: 1,
      priority: p.priority,
      alarmPrice: p.reached ? p.price + 5 : p.alarm,
      rarity: p.category,
      number: p.category,
      series: p.series,
    };
  });

  return [...fromCards, ...sealed].map(normalizeWishlistItem);
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // One-time upgrade to mockup demo set (v3)
      if (!localStorage.getItem(SEEDED_KEY)) {
        const demo = buildDemoWishlist();
        setItems(demo);
        localStorage.setItem(SEEDED_KEY, "1");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      } else {
        const stored =
          localStorage.getItem(STORAGE_KEY) ??
          localStorage.getItem(STORAGE_KEY_LEGACY);
        if (stored) {
          const parsed = JSON.parse(stored) as WishlistItem[];
          setItems(parsed.map(normalizeWishlistItem));
        }
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
      return [...prev, normalizeWishlistItem(item)];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<WishlistItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? normalizeWishlistItem({ ...item, ...patch }) : item,
      ),
    );
  }, []);

  const toggleItem = useCallback((item: WishlistItem) => {
    // Functional update avoids stale isInWishlist closures
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        return prev.filter((i) => i.id !== item.id);
      }
      return [...prev, normalizeWishlistItem(item)];
    });
  }, []);

  const totalValue = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
        0,
      ),
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
      updateItem,
      ready,
    }),
    [
      items,
      totalValue,
      isInWishlist,
      addItem,
      removeItem,
      toggleItem,
      updateItem,
      ready,
    ],
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
