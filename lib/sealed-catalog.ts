import type { TcgSet } from "@/lib/pokemon-tcg";

export type SealedProductType =
  | "Booster Display"
  | "Top-Trainer-Box"
  | "Booster Bundle"
  | "Tin"
  | "Blister"
  | "Kollektion";

export type CatalogSealedProduct = {
  id: string;
  name: string;
  productType: SealedProductType;
  setId: string;
  setName: string;
  series: string;
  language: "DE" | "EN" | "JP" | "FR";
  releaseDate: string;
  price: number;
  changePct: number;
  /** gradient seed for placeholder art */
  hue: number;
};

export const PRODUCT_TYPE_CHIPS: {
  id: SealedProductType | "all";
  label: string;
}[] = [
  { id: "Booster Display", label: "Booster Displays" },
  { id: "Top-Trainer-Box", label: "Top-Trainer-Boxen" },
  { id: "Booster Bundle", label: "Booster Bundles" },
  { id: "Tin", label: "Tins" },
  { id: "Blister", label: "Blister" },
  { id: "Kollektion", label: "Kollektionen" },
];

const TYPE_CONFIG: Record<
  SealedProductType,
  { suffix: string; basePrice: number; langs: Array<"DE" | "EN" | "JP" | "FR"> }
> = {
  "Booster Display": {
    suffix: "Booster Display",
    basePrice: 119.9,
    langs: ["DE", "EN"],
  },
  "Top-Trainer-Box": {
    suffix: "Top-Trainer-Box",
    basePrice: 54.9,
    langs: ["DE", "EN", "JP"],
  },
  "Booster Bundle": {
    suffix: "Booster Bundle",
    basePrice: 26.9,
    langs: ["DE", "EN"],
  },
  Tin: { suffix: "Tin", basePrice: 19.9, langs: ["DE", "EN"] },
  Blister: { suffix: "Blister", basePrice: 6.9, langs: ["DE", "EN", "JP"] },
  Kollektion: {
    suffix: "Kollektion",
    basePrice: 34.9,
    langs: ["DE", "EN"],
  },
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function changeFor(id: string): number {
  const h = hash(id);
  // -3.5 … +6.5
  return Math.round(((h % 100) / 10 - 3.5) * 10) / 10;
}

function priceFor(type: SealedProductType, setId: string, lang: string): number {
  const base = TYPE_CONFIG[type].basePrice;
  const h = hash(`${setId}-${type}-${lang}`);
  const jitter = 1 + ((h % 30) - 10) / 100;
  return Math.round(base * jitter * 100) / 100;
}

/** Build a demo sealed product catalog from real set list */
export function buildSealedCatalog(sets: TcgSet[]): CatalogSealedProduct[] {
  // Prefer modern mainline sets for a full shop-like catalog
  const candidates = sets
    .filter((s) => {
      const y = s.releaseDate ? Number(s.releaseDate.slice(0, 4)) : 0;
      return y >= 2020 && s.total >= 60;
    })
    .sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""));

  const products: CatalogSealedProduct[] = [];
  const types = Object.keys(TYPE_CONFIG) as SealedProductType[];

  for (const set of candidates) {
    for (const type of types) {
      // Not every set gets every product type
      const h = hash(`${set.id}-${type}`);
      if (type === "Top-Trainer-Box" || type === "Booster Display") {
        // always generate these for main sets
      } else if (h % 3 === 0) {
        continue;
      }

      const langs = TYPE_CONFIG[type].langs;
      const lang = langs[h % langs.length];
      const id = `sealed-cat-${set.id}-${type.replace(/\s+/g, "-").toLowerCase()}-${lang}`;
      products.push({
        id,
        name: `${set.name} ${TYPE_CONFIG[type].suffix}`,
        productType: type,
        setId: set.id,
        setName: set.name,
        series: set.series,
        language: lang,
        releaseDate: set.releaseDate || "2024-01-01",
        price: priceFor(type, set.id, lang),
        changePct: changeFor(id),
        hue: h % 360,
      });
    }
  }

  return products;
}

export function filterSealedCatalog(
  catalog: CatalogSealedProduct[],
  opts: {
    search?: string;
    productType?: SealedProductType | "all" | "";
    series?: string;
    language?: string; // DE/EN/… or empty/all
    year?: string; // "2024" or empty
    sort?: "relevance" | "price-desc" | "price-asc" | "name" | "date-desc";
  },
): CatalogSealedProduct[] {
  const term = (opts.search ?? "").trim().toLowerCase();
  let rows = catalog;

  if (term) {
    rows = rows.filter((p) => {
      const hay = [
        p.name,
        p.setName,
        p.series,
        p.productType,
        p.productType.replace(/-/g, " "),
        // allow "top trainer box" / "etb" style queries
        p.productType === "Top-Trainer-Box"
          ? "top trainer box etb elite trainer"
          : "",
        p.productType === "Booster Display" ? "display booster box" : "",
      ]
        .join(" ")
        .toLowerCase();
      return term
        .split(/\s+/)
        .every((t) => hay.includes(t) || hay.includes(t.replace(/-/g, " ")));
    });
  }

  if (opts.productType && opts.productType !== "all") {
    rows = rows.filter((p) => p.productType === opts.productType);
  }

  if (opts.series) {
    rows = rows.filter((p) => p.series === opts.series);
  }

  if (opts.language && opts.language !== "Alle" && opts.language !== "all") {
    const lang = opts.language.toUpperCase();
    rows = rows.filter((p) => p.language === lang);
  }

  if (opts.year) {
    rows = rows.filter((p) => p.releaseDate.startsWith(opts.year!));
  }

  const sort = opts.sort ?? "relevance";
  rows = [...rows].sort((a, b) => {
    switch (sort) {
      case "price-desc":
        return b.price - a.price;
      case "price-asc":
        return a.price - b.price;
      case "name":
        return a.name.localeCompare(b.name, "de");
      case "date-desc":
        return b.releaseDate.localeCompare(a.releaseDate);
      case "relevance":
      default:
        // prefer exact product-type match weight already applied via filter;
        // secondary: newer + higher price
        return (
          b.releaseDate.localeCompare(a.releaseDate) || b.price - a.price
        );
    }
  });

  return rows;
}

export function productTypeTitle(type: SealedProductType | "all" | ""): string {
  switch (type) {
    case "Top-Trainer-Box":
      return "Top-Trainer-Boxen";
    case "Booster Display":
      return "Booster Displays";
    case "Booster Bundle":
      return "Booster Bundles";
    case "Tin":
      return "Tins";
    case "Blister":
      return "Blister";
    case "Kollektion":
      return "Kollektionen";
    default:
      return "Sealed Produkte";
  }
}

export function detectProductTypeFromSearch(
  search: string,
): SealedProductType | null {
  const t = search.trim().toLowerCase().replace(/-/g, " ");
  if (
    t.includes("top trainer") ||
    t.includes("trainer box") ||
    t.includes("etb") ||
    t.includes("elite trainer")
  ) {
    return "Top-Trainer-Box";
  }
  if (t.includes("display") || t.includes("booster box")) {
    return "Booster Display";
  }
  if (t.includes("bundle")) return "Booster Bundle";
  if (t.includes("tin") || t.includes("dose")) return "Tin";
  if (t.includes("blister")) return "Blister";
  if (t.includes("kollektion") || t.includes("collection")) return "Kollektion";
  return null;
}
