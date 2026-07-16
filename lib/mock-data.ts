import { formatChange, formatCurrency } from "./format";
import { getDemoSealedImages } from "@/lib/sealed-images";

export type Card = {
  id: string;
  name: string;
  setId: string;
  setName: string;
  setCode: string;
  number: string;
  rarity: string;
  imageUrl: string;
  price: number;
  language: string;
  type?: string;
  hp?: number;
};

export type CollectionRow = {
  cardId: string;
  /** TCGdex-Karten-ID für Abgleich mit der Kartendatenbank */
  tcgCardId?: string;
  condition: "Near Mint" | "Mint" | "Excellent" | "Good" | "Played";
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  marketValue: number;
  addedAgo?: string;
};

export type SetInfo = {
  id: string;
  name: string;
  series: string;
  totalCards: number;
  ownedCards: number;
  totalValue: number;
  tcgSetCode: string;
  logoUrl: string;
  accent: string;
};

const img = (set: string, num: string) => {
  const id = /^\d+$/.test(num) ? String(parseInt(num, 10)) : num;
  return `https://images.pokemontcg.io/${set}/${id}_hires.png`;
};

const setLogo = (code: string) =>
  `https://images.pokemontcg.io/${code}/logo.png`;

export const cards: Record<string, Card> = {
  "charizard-ex": {
    id: "charizard-ex",
    name: "Glurak ex",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "199/165",
    rarity: "Special Illustration Rare",
    imageUrl: img("sv3pt5", "199"),
    price: 240,
    language: "Deutsch",
    type: "Feuer",
    hp: 330,
  },
  "pikachu-promo": {
    id: "pikachu-promo",
    name: "Pikachu Promo",
    setId: "promo",
    setName: "Promo",
    setCode: "SWSH",
    number: "SWSH020",
    rarity: "Promo",
    imageUrl: img("swshp", "SWSH020"),
    price: 150,
    language: "Deutsch",
    type: "Elektro",
  },
  "mew-ex": {
    id: "mew-ex",
    name: "Mew ex",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "205/165",
    rarity: "Special Illustration Rare",
    imageUrl: img("sv3pt5", "205"),
    price: 150,
    language: "Deutsch",
    type: "Psycho",
  },
  "giratina-v": {
    id: "giratina-v",
    name: "Giratina V",
    setId: "lost-origin",
    setName: "Verlorener Ursprung",
    setCode: "SWSH11",
    number: "186/196",
    rarity: "Alternate Art",
    imageUrl: img("swsh11", "186"),
    price: 90,
    language: "Deutsch",
    type: "Drache",
  },
  "lugia-vstar": {
    id: "lugia-vstar",
    name: "Lugia VSTAR",
    setId: "silver-tempest",
    setName: "Silberne Sturmwinde",
    setCode: "SWSH12",
    number: "139/195",
    rarity: "VSTAR",
    imageUrl: img("swsh12", "139"),
    price: 85,
    language: "Deutsch",
    type: "Farblos",
  },
  "charmander": {
    id: "charmander",
    name: "Glumanda",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "004/165",
    rarity: "Common",
    imageUrl: img("sv3pt5", "004"),
    price: 0.5,
    language: "Deutsch",
    type: "Feuer",
    hp: 70,
  },
  "charmeleon": {
    id: "charmeleon",
    name: "Glutexo",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "005/165",
    rarity: "Uncommon",
    imageUrl: img("sv3pt5", "005"),
    price: 0.8,
    language: "Deutsch",
    type: "Feuer",
    hp: 100,
  },
  "bulbasaur": {
    id: "bulbasaur",
    name: "Bisasam",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "001/165",
    rarity: "Common",
    imageUrl: img("sv3pt5", "001"),
    price: 0.08,
    language: "Deutsch",
    type: "Pflanze",
    hp: 70,
  },
  "ivysaur": {
    id: "ivysaur",
    name: "Bisaknosp",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "002/165",
    rarity: "Uncommon",
    imageUrl: img("sv3pt5", "002"),
    price: 0.15,
    language: "Deutsch",
    type: "Pflanze",
    hp: 100,
  },
  "venusaur": {
    id: "venusaur",
    name: "Bisaflor",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "003/165",
    rarity: "Rare",
    imageUrl: img("sv3pt5", "003"),
    price: 1.5,
    language: "Deutsch",
    type: "Pflanze",
    hp: 160,
  },
  "squirtle": {
    id: "squirtle",
    name: "Schiggy",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "007/165",
    rarity: "Common",
    imageUrl: img("sv3pt5", "007"),
    price: 0.1,
    language: "Deutsch",
    type: "Wasser",
    hp: 70,
  },
  "wartortle": {
    id: "wartortle",
    name: "Schillok",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "008/165",
    rarity: "Uncommon",
    imageUrl: img("sv3pt5", "008"),
    price: 0.2,
    language: "Deutsch",
    type: "Wasser",
    hp: 100,
  },
  "blastoise": {
    id: "blastoise",
    name: "Turtok",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "009/165",
    rarity: "Rare",
    imageUrl: img("sv3pt5", "009"),
    price: 2,
    language: "Deutsch",
    type: "Wasser",
    hp: 160,
  },
  "pikachu-151": {
    id: "pikachu-151",
    name: "Pikachu",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "025/165",
    rarity: "Common",
    imageUrl: img("sv3pt5", "025"),
    price: 65,
    language: "Deutsch",
    type: "Elektro",
    hp: 70,
  },
  "gardevoir-ex": {
    id: "gardevoir-ex",
    name: "Gardevoir ex",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "086/165",
    rarity: "Double Rare",
    imageUrl: img("sv1", "86"),
    price: 64,
    language: "Deutsch",
  },
  "koraidon-ex": {
    id: "koraidon-ex",
    name: "Koraidon ex",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "247/165",
    rarity: "Special Illustration Rare",
    imageUrl: img("sv4pt5", "245"),
    price: 38,
    language: "Deutsch",
  },
  "lugia-v": {
    id: "lugia-v",
    name: "Lugia V",
    setId: "silver-tempest",
    setName: "Silberne Sturmwinde",
    setCode: "SWSH12",
    number: "138/195",
    rarity: "Alternate Art",
    imageUrl: img("swsh12", "138"),
    price: 100,
    language: "Deutsch",
  },
  "magikarp": {
    id: "magikarp",
    name: "Karpador",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "129/165",
    rarity: "Common",
    imageUrl: img("sv3pt5", "129"),
    price: 16,
    language: "Deutsch",
  },
  "umbreon-v": {
    id: "umbreon-v",
    name: "Nachtara V",
    setId: "evolving-skies",
    setName: "Drachenwandel",
    setCode: "SWSH7",
    number: "215/203",
    rarity: "Alternate Art",
    imageUrl: img("swsh7", "215"),
    price: 95,
    language: "Deutsch",
  },
  "rayquaza-vmax": {
    id: "rayquaza-vmax",
    name: "Rayquaza VMAX",
    setId: "evolving-skies",
    setName: "Drachenwandel",
    setCode: "SWSH7",
    number: "218/203",
    rarity: "Alternate Art",
    imageUrl: img("swsh7", "218"),
    price: 540,
    language: "Deutsch",
  },
  "cyndaquil": {
    id: "cyndaquil",
    name: "Feurigel",
    setId: "neo-genesis",
    setName: "Neo Genesis",
    setCode: "NEO1",
    number: "57/111",
    rarity: "Common",
    imageUrl: img("neo1", "57"),
    price: 12,
    language: "Deutsch",
    type: "Feuer",
  },
  "ralts": {
    id: "ralts",
    name: "Trasla",
    setId: "151",
    setName: "Pokémon 151",
    setCode: "SV3PT5",
    number: "063/165",
    rarity: "Common",
    imageUrl: img("xy7", "52"),
    price: 3,
    language: "Deutsch",
    type: "Psycho",
  },
};

export const collection: CollectionRow[] = [
  {
    cardId: "charizard-ex",
    tcgCardId: "sv03.5-199",
    condition: "Near Mint",
    quantity: 2,
    purchasePrice: 180,
    purchaseDate: "01.02.2025",
    marketValue: 240,
    addedAgo: "vor 2 Tagen",
  },
  {
    cardId: "pikachu-promo",
    tcgCardId: "swshp-SWSH020",
    condition: "Mint",
    quantity: 1,
    purchasePrice: 95,
    purchaseDate: "15.01.2025",
    marketValue: 150,
    addedAgo: "vor 3 Tagen",
  },
  {
    cardId: "mew-ex",
    tcgCardId: "sv03.5-205",
    condition: "Near Mint",
    quantity: 1,
    purchasePrice: 85,
    purchaseDate: "20.12.2024",
    marketValue: 150,
    addedAgo: "vor 3 Tagen",
  },
  {
    cardId: "giratina-v",
    tcgCardId: "swsh11-186",
    condition: "Excellent",
    quantity: 1,
    purchasePrice: 65,
    purchaseDate: "10.11.2024",
    marketValue: 90,
    addedAgo: "vor 1 Woche",
  },
  {
    cardId: "lugia-vstar",
    tcgCardId: "swsh12-139",
    condition: "Near Mint",
    quantity: 1,
    purchasePrice: 70,
    purchaseDate: "05.10.2024",
    marketValue: 85,
    addedAgo: "vor 1 Woche",
  },
  {
    cardId: "cyndaquil",
    tcgCardId: "neo1-57",
    condition: "Good",
    quantity: 3,
    purchasePrice: 5,
    purchaseDate: "01.03.2024",
    marketValue: 12,
  },
  {
    cardId: "ralts",
    tcgCardId: "xy7-52",
    condition: "Excellent",
    quantity: 2,
    purchasePrice: 3,
    purchaseDate: "12.06.2024",
    marketValue: 3,
  },
];

export const sets: SetInfo[] = [
  {
    id: "151",
    name: "Pokémon 151",
    series: "Karmesin & Purpur",
    totalCards: 207,
    ownedCards: 192,
    totalValue: 3450,
    tcgSetCode: "sv3pt5",
    logoUrl: setLogo("sv3pt5"),
    accent: "#ef4444",
  },
  {
    id: "paldean-fates",
    name: "Paldean Fates",
    series: "Karmesin & Purpur",
    totalCards: 225,
    ownedCards: 162,
    totalValue: 1320,
    tcgSetCode: "sv4pt5",
    logoUrl: setLogo("sv4pt5"),
    accent: "#8b5cf6",
  },
  {
    id: "obsidian-flames",
    name: "Obsidian Flames",
    series: "Karmesin & Purpur",
    totalCards: 197,
    ownedCards: 98,
    totalValue: 1125,
    tcgSetCode: "sv3",
    logoUrl: setLogo("sv3"),
    accent: "#f97316",
  },
  {
    id: "paradox-rift",
    name: "Paradox Rift",
    series: "Karmesin & Purpur",
    totalCards: 160,
    ownedCards: 102,
    totalValue: 980,
    tcgSetCode: "sv4",
    logoUrl: setLogo("sv4"),
    accent: "#06b6d4",
  },
  {
    id: "stellar-crown",
    name: "Stellar Crown",
    series: "Karmesin & Purpur",
    totalCards: 120,
    ownedCards: 86,
    totalValue: 1660,
    tcgSetCode: "sv7",
    logoUrl: setLogo("sv7"),
    accent: "#eab308",
  },
  {
    id: "temporal-forces",
    name: "Temporal Forces",
    series: "Karmesin & Purpur",
    totalCards: 167,
    ownedCards: 84,
    totalValue: 860,
    tcgSetCode: "sv5",
    logoUrl: setLogo("sv5"),
    accent: "#3b82f6",
  },
  {
    id: "twilight-masquerade",
    name: "Twilight Masquerade",
    series: "Karmesin & Purpur",
    totalCards: 167,
    ownedCards: 86,
    totalValue: 670,
    tcgSetCode: "sv6",
    logoUrl: setLogo("sv6"),
    accent: "#a855f7",
  },
  {
    id: "shrouded-fable",
    name: "Shrouded Fable",
    series: "Karmesin & Purpur",
    totalCards: 95,
    ownedCards: 64,
    totalValue: 430,
    tcgSetCode: "sv6pt5",
    logoUrl: setLogo("sv6pt5"),
    accent: "#64748b",
  },
  {
    id: "sword-shield",
    name: "Schwert & Schild",
    series: "Schwert & Schild",
    totalCards: 128,
    ownedCards: 123,
    totalValue: 1890,
    tcgSetCode: "swsh1",
    logoUrl: setLogo("swsh1"),
    accent: "#0ea5e9",
  },
];

export const portfolioMetrics = {
  totalValue: 12450,
  invested: 9800,
  profitLoss: 2650,
  returnRate: 27.0,
  totalCards: 1245,
  sealedCount: 18,
  cardsValue: 8964,
  sealedValue: 3486,
  uniqueCards: 892,
  duplicates: 353,
  wishlistCount: 34,
  wishlistValue: 542,
  avgPurchasePrice: 7.88,
  bestCard: { name: "Glurak ex", value: 850 },
  weeklyChange: 3.2,
  weeklyChangeInvested: 2.8,
  pricesUpdatedLabel: "heute, 06:00 Uhr",
};

/** Mini-sparkline for metric cards (7 days) */
export const metricSparklines = {
  totalValue: [11800, 11920, 12050, 12180, 12240, 12350, 12450],
  invested: [9550, 9600, 9650, 9700, 9720, 9760, 9800],
  profitLoss: [2250, 2320, 2400, 2480, 2520, 2590, 2650],
  returnRate: [23.5, 24.2, 24.9, 25.5, 26.0, 26.5, 27.0],
};

export type HistoryPoint = {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Short axis label e.g. "15. Mai" */
  label: string;
  value: number;
  cards: number;
  sealed: number;
};

function buildDailyHistory(): HistoryPoint[] {
  const start = new Date(2024, 4, 15); // 15 May
  const end = new Date(2024, 5, 19); // 19 Jun
  const points: HistoryPoint[] = [];
  const totalDays =
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const t = i / (totalDays - 1);
    // Smooth growth with slight daily noise
    const wave = Math.sin(i * 0.35) * 120 + Math.cos(i * 0.17) * 80;
    const total = Math.round(8200 + t * 4250 + wave);
    const cards = Math.round(total * (0.7 + t * 0.02));
    const sealed = total - cards;
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
    });
    points.push({ date: iso, label, value: total, cards, sealed });
  }

  // Pin last point to metrics
  const last = points[points.length - 1];
  last.value = portfolioMetrics.totalValue;
  last.cards = portfolioMetrics.cardsValue;
  last.sealed = portfolioMetrics.sealedValue;
  last.label = "19. Jun";
  last.date = "2024-06-19";

  return points;
}

/** Daily portfolio history (for chart hover tooltips) */
export const portfolioHistoryDaily: HistoryPoint[] = buildDailyHistory();

/** Sparse labels used by older charts — weekly samples */
export const portfolioHistory = portfolioHistoryDaily
  .filter((_, i, arr) => i % 7 === 0 || i === arr.length - 1)
  .map((p) => ({ label: p.label, value: p.value }));

export const portfolioAllocation = [
  {
    label: "Karten",
    percent: 72,
    color: "#f472b6",
    value: portfolioMetrics.cardsValue,
  },
  {
    label: "Sealed",
    percent: 28,
    color: "#a78bfa",
    value: portfolioMetrics.sealedValue,
  },
];

/** Secondary breakdown under Portfolio-Aufteilung (by category / product) */
export const portfolioAllocationBreakdown = [
  {
    label: "Einzelkarten",
    percent: 58,
    color: "#f472b6",
    value: Math.round(portfolioMetrics.cardsValue * 0.8),
  },
  {
    label: "Booster Displays",
    percent: 16,
    color: "#a78bfa",
    value: Math.round(portfolioMetrics.sealedValue * 0.55),
  },
  {
    label: "Trainer-Boxen & Bundles",
    percent: 12,
    color: "#c084fc",
    value: Math.round(portfolioMetrics.sealedValue * 0.45),
  },
  {
    label: "Rest (Bulk / Sonstiges)",
    percent: 14,
    color: "#71717a",
    value: Math.round(portfolioMetrics.cardsValue * 0.2),
  },
];

export const setProgress = [
  { setId: "151", owned: 192, total: 207 },
  { setId: "paldean-fates", owned: 162, total: 225 },
  { setId: "temporal-forces", owned: 84, total: 167 },
];

export type RankedMover = {
  cardId: string;
  change: number;
  price?: number;
};

export const topPerformers: RankedMover[] = [
  { cardId: "charizard-ex", change: 22.4, price: 128.5 },
  { cardId: "pikachu-promo", change: 18.7, price: 42.3 },
  { cardId: "mew-ex", change: 15.3, price: 110.0 },
];

export const topLosers: RankedMover[] = [
  { cardId: "koraidon-ex", change: -11.2, price: 74.2 },
  { cardId: "gardevoir-ex", change: -8.4, price: 89.9 },
  { cardId: "lugia-vstar", change: -6.1, price: 64.0 },
];

/** Top 10 for detail pages */
export const topPerformersAll: RankedMover[] = [
  ...topPerformers,
  { cardId: "umbreon-v", change: 14.1, price: 95.0 },
  { cardId: "rayquaza-vmax", change: 12.8, price: 540.0 },
  { cardId: "lugia-v", change: 11.5, price: 100.0 },
  { cardId: "giratina-v", change: 10.2, price: 90.0 },
  { cardId: "pikachu-151", change: 9.4, price: 65.0 },
  { cardId: "magikarp", change: 8.1, price: 16.0 },
  { cardId: "blastoise", change: 6.7, price: 2.0 },
];

export type MoverKind = "Karte" | "Sealed";

/** Full row for Top Verlierer / Top Performer detail pages */
export type DetailedMover = {
  id: string;
  cardId: string;
  /** Optional display name (falls back to card name) */
  name?: string;
  kind: MoverKind;
  setName: string;
  language?: string;
  condition?: string;
  valueBefore: number;
  currentValue: number;
  changeAbs: number;
  changePct: number;
  /** Sparkline values (oldest → newest) */
  trend: number[];
};

function decliningTrend(start: number, end: number, n = 8): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wave = Math.sin(i * 1.1) * (start - end) * 0.06;
    pts.push(start + (end - start) * t + wave);
  }
  pts[pts.length - 1] = end;
  return pts.map((v) => Math.round(v * 100) / 100);
}

const topLosersDetailedRaw: DetailedMover[] = [
  {
    id: "l1",
    cardId: "koraidon-ex",
    name: "Koradon, Titan des Sturms",
    kind: "Karte",
    setName: "Legendenkrieg",
    valueBefore: 74.2,
    currentValue: 65.9,
    changeAbs: -8.3,
    changePct: -11.2,
    trend: decliningTrend(74.2, 65.9),
  },
  {
    id: "l2",
    cardId: "gardevoir-ex",
    name: "Vortex-Drachen",
    kind: "Karte",
    setName: "Sternenzyklus",
    valueBefore: 89.9,
    currentValue: 81.4,
    changeAbs: -8.5,
    changePct: -9.5,
    trend: decliningTrend(89.9, 81.4),
  },
  {
    id: "l3",
    cardId: "charizard-ex",
    name: "Aurelion, Sternenruferin",
    kind: "Karte",
    setName: "Mythisch",
    valueBefore: 128.5,
    currentValue: 117.8,
    changeAbs: -10.7,
    changePct: -8.3,
    trend: decliningTrend(128.5, 117.8),
  },
  {
    id: "l4",
    cardId: "umbreon-v",
    name: "Schattenzirkel",
    kind: "Karte",
    setName: "Nebelpfade",
    valueBefore: 42.3,
    currentValue: 38.9,
    changeAbs: -3.4,
    changePct: -8.0,
    trend: decliningTrend(42.3, 38.9),
  },
  {
    id: "l5",
    cardId: "mew-ex",
    name: "Eclipse: Aufstieg Display",
    kind: "Sealed",
    setName: "Eclipse",
    valueBefore: 110.0,
    currentValue: 102.2,
    changeAbs: -7.8,
    changePct: -7.1,
    trend: decliningTrend(110, 102.2),
  },
  {
    id: "l6",
    cardId: "giratina-v",
    name: "Nebelwanderer",
    kind: "Karte",
    setName: "Nebelpfade",
    valueBefore: 36.8,
    currentValue: 34.3,
    changeAbs: -2.5,
    changePct: -6.8,
    trend: decliningTrend(36.8, 34.3),
  },
  {
    id: "l7",
    cardId: "rayquaza-vmax",
    name: "Phönixwache",
    kind: "Karte",
    setName: "Flammenbund",
    valueBefore: 42.3,
    currentValue: 39.7,
    changeAbs: -2.6,
    changePct: -6.1,
    trend: decliningTrend(42.3, 39.7),
  },
  {
    id: "l8",
    cardId: "lugia-vstar",
    name: "Sturmfront Booster Box",
    kind: "Sealed",
    setName: "Sturmfront",
    valueBefore: 64.0,
    currentValue: 60.2,
    changeAbs: -3.8,
    changePct: -5.9,
    trend: decliningTrend(64, 60.2),
  },
  {
    id: "l9",
    cardId: "pikachu-151",
    name: "Lyra, Lichtgesang",
    kind: "Karte",
    setName: "Lichtbringer",
    valueBefore: 29.9,
    currentValue: 28.2,
    changeAbs: -1.7,
    changePct: -5.7,
    trend: decliningTrend(29.9, 28.2),
  },
  {
    id: "l10",
    cardId: "pikachu-promo",
    name: "Schattenzirkel Trainer Box",
    kind: "Sealed",
    setName: "Nebelpfade",
    valueBefore: 34.9,
    currentValue: 33.8,
    changeAbs: -1.1,
    changePct: -3.1,
    trend: decliningTrend(34.9, 33.8),
  },
];

function withMoverMeta(rows: DetailedMover[]): DetailedMover[] {
  return rows.map((row, i) => {
    const langs = ["DE", "DE", "EN", "DE", "JP", "EN", "DE", "DE", "EN", "DE"];
    const conditions =
      row.kind === "Sealed"
        ? ["OVP", "OVP", "OVP – leichte Mängel", "OVP"]
        : ["NM", "NM", "EX", "M", "NM", "GD", "NM", "EX", "NM", "NM"];
    return {
      ...row,
      language: row.language ?? langs[i % langs.length],
      condition: row.condition ?? conditions[i % conditions.length],
    };
  });
}

export const topLosersDetailed: DetailedMover[] =
  withMoverMeta(topLosersDetailedRaw);

/** @deprecated use topLosersDetailed — kept for simple lists */
export const topLosersAll: RankedMover[] = topLosersDetailed.map((m) => ({
  cardId: m.cardId,
  change: m.changePct,
  price: m.valueBefore,
}));

export const topLosersSummary = {
  biggestDropPct: -11.2,
  totalLossAbs: -184.6,
  affectedCount: 10,
  pricesUpdatedLabel: "heute, 06:00 Uhr",
};

/** Detailed rows for Top Performer page (mirrors Top Verlierer) */
const topPerformersDetailedRaw: DetailedMover[] = [
  {
    id: "w1",
    cardId: "charizard-ex",
    name: "Glurak ex",
    kind: "Karte",
    setName: "Pokémon 151",
    valueBefore: 105.0,
    currentValue: 128.5,
    changeAbs: 23.5,
    changePct: 22.4,
    trend: decliningTrend(105, 128.5),
  },
  {
    id: "w2",
    cardId: "pikachu-promo",
    name: "Pikachu Promo",
    kind: "Karte",
    setName: "Promo",
    valueBefore: 35.6,
    currentValue: 42.3,
    changeAbs: 6.7,
    changePct: 18.7,
    trend: decliningTrend(35.6, 42.3),
  },
  {
    id: "w3",
    cardId: "mew-ex",
    name: "Mew ex",
    kind: "Karte",
    setName: "Pokémon 151",
    valueBefore: 95.4,
    currentValue: 110.0,
    changeAbs: 14.6,
    changePct: 15.3,
    trend: decliningTrend(95.4, 110),
  },
  {
    id: "w4",
    cardId: "umbreon-v",
    name: "Nachtara V",
    kind: "Karte",
    setName: "Drachenwandel",
    valueBefore: 83.3,
    currentValue: 95.0,
    changeAbs: 11.7,
    changePct: 14.1,
    trend: decliningTrend(83.3, 95),
  },
  {
    id: "w5",
    cardId: "rayquaza-vmax",
    name: "Rayquaza VMAX",
    kind: "Karte",
    setName: "Drachenwandel",
    valueBefore: 478.7,
    currentValue: 540.0,
    changeAbs: 61.3,
    changePct: 12.8,
    trend: decliningTrend(478.7, 540),
  },
  {
    id: "w6",
    cardId: "lugia-v",
    name: "Lugia V",
    kind: "Karte",
    setName: "Silberne Sturmwinde",
    valueBefore: 89.7,
    currentValue: 100.0,
    changeAbs: 10.3,
    changePct: 11.5,
    trend: decliningTrend(89.7, 100),
  },
  {
    id: "w7",
    cardId: "mew-ex",
    name: "Stellarkrone Booster Display",
    kind: "Sealed",
    setName: "Stellarkrone",
    valueBefore: 142.0,
    currentValue: 156.0,
    changeAbs: 14.0,
    changePct: 9.9,
    trend: decliningTrend(142, 156),
  },
  {
    id: "w8",
    cardId: "giratina-v",
    name: "Giratina V",
    kind: "Karte",
    setName: "Verlorener Ursprung",
    valueBefore: 81.7,
    currentValue: 90.0,
    changeAbs: 8.3,
    changePct: 10.2,
    trend: decliningTrend(81.7, 90),
  },
  {
    id: "w9",
    cardId: "charizard-ex",
    name: "Paradoxrift Top-Trainer-Box",
    kind: "Sealed",
    setName: "Paradoxrift",
    valueBefore: 89.5,
    currentValue: 98.0,
    changeAbs: 8.5,
    changePct: 9.5,
    trend: decliningTrend(89.5, 98),
  },
  {
    id: "w10",
    cardId: "pikachu-151",
    name: "Pikachu",
    kind: "Karte",
    setName: "Pokémon 151",
    valueBefore: 59.4,
    currentValue: 65.0,
    changeAbs: 5.6,
    changePct: 9.4,
    trend: decliningTrend(59.4, 65),
  },
];

export const topPerformersDetailed: DetailedMover[] = withMoverMeta(
  topPerformersDetailedRaw,
);

export const topPerformersSummary = {
  biggestGainPct: 22.4,
  totalGainAbs: 164.5,
  affectedCount: 10,
  pricesUpdatedLabel: "heute, 06:00 Uhr",
};

export type RecentAddition = {
  cardId: string;
  kind: "Karte" | "Sealed";
  dateLabel: string;
};

export const recentAdditions: RecentAddition[] = [
  { cardId: "mew-ex", kind: "Karte", dateLabel: "18. Jun. 2024" },
  { cardId: "charizard-ex", kind: "Sealed", dateLabel: "18. Jun. 2024" },
  { cardId: "giratina-v", kind: "Karte", dateLabel: "17. Jun. 2024" },
  { cardId: "pikachu-promo", kind: "Sealed", dateLabel: "16. Jun. 2024" },
];

export const valuableCards = [
  { cardId: "charizard-ex", value: 850 },
  { cardId: "lugia-v", value: 620 },
  { cardId: "rayquaza-vmax", value: 540 },
  { cardId: "pikachu-promo", value: 410 },
  { cardId: "mew-ex", value: 390 },
];

export const biggestWinners = [
  { cardId: "charizard-ex", change: 100 },
  { cardId: "pikachu-promo", change: 85 },
  { cardId: "mew-ex", change: 65 },
];

export const biggestLosers = [
  { cardId: "koraidon-ex", change: -40 },
  { cardId: "gardevoir-ex", change: -30 },
  { cardId: "lugia-vstar", change: -25 },
];

export const portfolioDistribution = [
  { label: "151", percent: 42, color: "#d9779a" },
  { label: "Fusion Strike", percent: 21, color: "#8b5cf6" },
  { label: "Evolving Skies", percent: 18, color: "#06b6d4" },
  { label: "Promo", percent: 10, color: "#22c55e" },
  { label: "Sonstige", percent: 7, color: "#a1a1aa" },
];

export const investmentStats = [
  { label: "Durchschn. Haltedauer", value: "186 Tage" },
  { label: "Ø Rendite pro Karte", value: "+27,0 %" },
  { label: "Beste Investition", value: "Glurak ex" },
  { label: "Letzter Kauf", value: "15.06.2024" },
];

export const monthlyPurchases = [
  { label: "Jan", value: 420 },
  { label: "Feb", value: 680 },
  { label: "Mär", value: 2100 },
  { label: "Apr", value: 1850 },
  { label: "Mai", value: 2400 },
  { label: "Jun", value: 1950 },
  { label: "Jul", value: 1200 },
  { label: "Aug", value: 890 },
  { label: "Sep", value: 640 },
  { label: "Okt", value: 520 },
  { label: "Nov", value: 780 },
  { label: "Dez", value: 1100 },
];

export const recentPurchases = [
  { cardId: "charizard-ex", price: 850, date: "15.06.2024" },
  { cardId: "pikachu-promo", price: 410, date: "09.06.2024" },
  { cardId: "mew-ex", price: 390, date: "02.06.2024" },
];

/** ── Portfolio page (investment analytics — distinct from Dashboard) ── */

export const portfolioAnalytics = {
  totalValue: 12450,
  invested: 9800,
  unrealizedProfit: 2450,
  realizedProfit: 200,
  totalReturnRate: 27.0,
  weeklyChange: 3.2,
  avgPurchasePrice: 7.88,
  holdDays: 186,
  top5Share: 38,
  cardsValue: 8217,
  cardsInvested: 6250,
  sealedValue: 4233,
  sealedInvested: 3550,
  largestPosition: 850,
  bestReturnPct: 52.0,
  worstReturnPct: -20.0,
  distinctAssets: 929,
  pricesUpdatedLabel: "heute, 06:00 Uhr",
};

export type PortfolioHistoryPoint = {
  date: string;
  label: string;
  market: number;
  invested: number;
  cards: number;
  sealed: number;
};

function buildPortfolioYearHistory(): PortfolioHistoryPoint[] {
  // ~Jun 2023 → Mai 2024 monthly samples (smooth for chart)
  const months: { y: number; m: number; market: number; invested: number }[] = [
    { y: 2023, m: 5, market: 5200, invested: 5100 },
    { y: 2023, m: 6, market: 5600, invested: 5400 },
    { y: 2023, m: 7, market: 6100, invested: 5800 },
    { y: 2023, m: 8, market: 6800, invested: 6200 },
    { y: 2023, m: 9, market: 7400, invested: 6800 },
    { y: 2023, m: 10, market: 7900, invested: 7200 },
    { y: 2023, m: 11, market: 8500, invested: 7600 },
    { y: 2024, m: 0, market: 9200, invested: 8000 },
    { y: 2024, m: 1, market: 9800, invested: 8400 },
    { y: 2024, m: 2, market: 11250, invested: 8900 }, // Mar 15 hover point
    { y: 2024, m: 3, market: 11800, invested: 9300 },
    { y: 2024, m: 4, market: 12450, invested: 9800 },
  ];

  const points: PortfolioHistoryPoint[] = [];
  for (const row of months) {
    const d = new Date(row.y, row.m, row.m === 2 ? 15 : 1);
    const cards = Math.round(row.market * 0.66);
    const sealed = row.market - cards;
    points.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      market: row.market,
      invested: row.invested,
      cards,
      sealed,
    });
  }
  return points;
}

export const portfolioYearHistory: PortfolioHistoryPoint[] =
  buildPortfolioYearHistory();

export const portfolioAssetPerformance = [
  {
    type: "Karten" as const,
    market: 8217,
    invested: 6250,
    profit: 1967,
    returnPct: 31.5,
    share: 66,
    color: "#f472b6",
  },
  {
    type: "Sealed" as const,
    market: 4233,
    invested: 3550,
    profit: 683,
    returnPct: 19.2,
    share: 34,
    color: "#71717a",
  },
];

export type ValuablePosition = {
  cardId: string;
  name?: string;
  setCode: string;
  kind: "Karte" | "Sealed";
  market: number;
  sharePct: number;
};

export const valuablePositions: ValuablePosition[] = [
  {
    cardId: "charizard-ex",
    name: "Glurak ex",
    setCode: "SV3PT5",
    kind: "Karte",
    market: 850,
    sharePct: 6.8,
  },
  {
    cardId: "lugia-v",
    name: "Lugia V",
    setCode: "SWSH12",
    kind: "Karte",
    market: 620,
    sharePct: 5.0,
  },
  {
    cardId: "rayquaza-vmax",
    name: "Schattensturm Booster Display",
    setCode: "Booster Box",
    kind: "Sealed",
    market: 540,
    sharePct: 4.3,
  },
  {
    cardId: "pikachu-promo",
    name: "Drachenaufstieg Top-Trainer Box",
    setCode: "Top-Trainer Box",
    kind: "Sealed",
    market: 410,
    sharePct: 3.3,
  },
  {
    cardId: "mew-ex",
    name: "Pikachu Promo",
    setCode: "SWSH",
    kind: "Karte",
    market: 390,
    sharePct: 3.1,
  },
];

export type CashflowMonth = {
  label: string;
  buys: number;
  sells: number;
};

export const portfolioCashflow: CashflowMonth[] = [
  { label: "Jun '23", buys: 900, sells: 200 },
  { label: "Jul '23", buys: 1100, sells: 350 },
  { label: "Aug '23", buys: 1400, sells: 1800 },
  { label: "Sep '23", buys: 800, sells: 400 },
  { label: "Okt '23", buys: 1200, sells: 300 },
  { label: "Nov '23", buys: 1500, sells: 600 },
  { label: "Dez '23", buys: 1000, sells: 450 },
  { label: "Jan '24", buys: 900, sells: 700 },
  { label: "Feb '24", buys: 1300, sells: 200 },
  { label: "Mär '24", buys: 1600, sells: 900 },
  { label: "Apr '24", buys: 1800, sells: 500 },
  { label: "Mai '24", buys: 1100, sells: 400 },
];

export type PortfolioTransaction = {
  id: string;
  date: string;
  type: "Kauf" | "Verkauf" | "Karte";
  cardId: string;
  name?: string;
  setCode?: string;
  qty: number;
  total: number;
};

export const portfolioTransactions: PortfolioTransaction[] = [
  {
    id: "t1",
    date: "15.06.2024",
    type: "Kauf",
    cardId: "charizard-ex",
    name: "Glurak ex (SV3PT5)",
    qty: 1,
    total: 850,
  },
  {
    id: "t2",
    date: "09.06.2024",
    type: "Kauf",
    cardId: "pikachu-promo",
    name: "Pikachu Promo (SWSH)",
    qty: 1,
    total: 390,
  },
  {
    id: "t3",
    date: "06.06.2024",
    type: "Verkauf",
    cardId: "rayquaza-vmax",
    name: "Feuerdrachen Booster Box",
    qty: 1,
    total: -620,
  },
  {
    id: "t4",
    date: "02.06.2024",
    type: "Karte",
    cardId: "mew-ex",
    name: "Drachenaufstieg Top-Trainer Box",
    qty: 1,
    total: 410,
  },
];

/** ── Portfolio → Transaktionen tab ── */

export type TxKind = "Kauf" | "Verkauf";

export type DetailedTransaction = {
  id: string;
  /** ISO YYYY-MM-DD for sorting/filtering */
  dateIso: string;
  dateLabel: string;
  type: TxKind;
  cardId: string;
  name: string;
  assetType: "Karte" | "Sealed";
  setName: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  total: number;
  realizedProfit: number | null;
  note: string;
};

export const portfolioTxMetrics = {
  buyCount: 128,
  buyVolume: 9800,
  sellCount: 14,
  sellVolume: 1480,
  realizedProfit: 200,
  realizedReturnPct: 15.6,
  fees: 48.5,
  avgBuy: 76.56,
  avgSell: 105.71,
  lastTxDate: "15.06.2024",
  totalTx: 142,
  cardTx: 116,
  sealedTx: 26,
  buySharePct: 90,
  sellSharePct: 10,
  busiestMonth: "Mai 2024",
};

export type TxCashflowMonth = {
  label: string;
  buys: number;
  sells: number;
  net: number;
};

export const portfolioTxCashflow: TxCashflowMonth[] = [
  { label: "Jul '23", buys: 620, sells: 0, net: -620 },
  { label: "Aug '23", buys: 400, sells: 550, net: 150 },
  { label: "Sep '23", buys: 780, sells: 120, net: -660 },
  { label: "Okt '23", buys: 520, sells: 200, net: -320 },
  { label: "Nov '23", buys: 350, sells: 80, net: -270 },
  { label: "Dez '23", buys: 900, sells: 400, net: -500 },
  { label: "Jan '24", buys: 280, sells: 150, net: -130 },
  { label: "Feb '24", buys: 450, sells: 100, net: -350 },
  { label: "Mär '24", buys: 1100, sells: 600, net: -500 },
  { label: "Apr '24", buys: 700, sells: 350, net: -350 },
  { label: "Mai '24", buys: 680, sells: 1120, net: 440 },
  { label: "Jun '24", buys: 500, sells: 200, net: -300 },
];

export const portfolioTxHistory: DetailedTransaction[] = [
  {
    id: "tx1",
    dateIso: "2024-06-15",
    dateLabel: "15.06.2024",
    type: "Kauf",
    cardId: "umbreon-v",
    name: "Schattenwächter Lyrix",
    assetType: "Karte",
    setName: "Nebelpfade",
    quantity: 1,
    pricePerUnit: 120,
    fees: 2.4,
    total: 122.4,
    realizedProfit: null,
    note: "Cardmarket",
  },
  {
    id: "tx2",
    dateIso: "2024-06-12",
    dateLabel: "12.06.2024",
    type: "Verkauf",
    cardId: "giratina-v",
    name: "Sturmklinge Zarek",
    assetType: "Karte",
    setName: "Sturmfront",
    quantity: 1,
    pricePerUnit: 85,
    fees: 1.7,
    total: 83.3,
    realizedProfit: 38.3,
    note: "Privatverkauf",
  },
  {
    id: "tx3",
    dateIso: "2024-06-08",
    dateLabel: "08.06.2024",
    type: "Kauf",
    cardId: "charizard-ex",
    name: "Horizontwächter Booster Display",
    assetType: "Sealed",
    setName: "Stellar Horizon",
    quantity: 1,
    pricePerUnit: 110,
    fees: 2.2,
    total: 112.2,
    realizedProfit: null,
    note: "Messe München",
  },
  {
    id: "tx4",
    dateIso: "2024-06-03",
    dateLabel: "03.06.2024",
    type: "Kauf",
    cardId: "mew-ex",
    name: "Eldritch Nexus Trainer Box",
    assetType: "Sealed",
    setName: "Eldritch Nexus",
    quantity: 1,
    pricePerUnit: 45,
    fees: 0.9,
    total: 45.9,
    realizedProfit: null,
    note: "Cardmarket",
  },
  {
    id: "tx5",
    dateIso: "2024-05-28",
    dateLabel: "28.05.2024",
    type: "Verkauf",
    cardId: "lugia-v",
    name: "Astralpriesterin Vela",
    assetType: "Karte",
    setName: "Zeitzirkel",
    quantity: 2,
    pricePerUnit: 75,
    fees: 3.0,
    total: 147.0,
    realizedProfit: 51.0,
    note: "Cardmarket",
  },
  {
    id: "tx6",
    dateIso: "2024-05-22",
    dateLabel: "22.05.2024",
    type: "Kauf",
    cardId: "pikachu-promo",
    name: "Nebelpfade Booster Bundle",
    assetType: "Sealed",
    setName: "Nebelpfade",
    quantity: 1,
    pricePerUnit: 28,
    fees: 0.56,
    total: 28.56,
    realizedProfit: null,
    note: "Excel-Import",
  },
  {
    id: "tx7",
    dateIso: "2024-05-18",
    dateLabel: "18.05.2024",
    type: "Verkauf",
    cardId: "rayquaza-vmax",
    name: "Voidschlag-Klinge",
    assetType: "Karte",
    setName: "Void Strike",
    quantity: 1,
    pricePerUnit: 48,
    fees: 0.96,
    total: 47.04,
    realizedProfit: -5.96,
    note: "Cardmarket",
  },
  {
    id: "tx8",
    dateIso: "2024-05-10",
    dateLabel: "10.05.2024",
    type: "Kauf",
    cardId: "lugia-vstar",
    name: "Chronik der Weltbäume Display",
    assetType: "Sealed",
    setName: "Chronik",
    quantity: 1,
    pricePerUnit: 95,
    fees: 1.9,
    total: 96.9,
    realizedProfit: null,
    note: "Messe Stuttgart",
  },
  {
    id: "tx9",
    dateIso: "2024-05-05",
    dateLabel: "05.05.2024",
    type: "Verkauf",
    cardId: "koraidon-ex",
    name: "Runenschmied Brakka",
    assetType: "Karte",
    setName: "Flammenbund",
    quantity: 1,
    pricePerUnit: 65,
    fees: 1.3,
    total: 63.7,
    realizedProfit: 18.7,
    note: "Privatverkauf",
  },
];

export const portfolioAllocationBy = {
  assetType: [
    { label: "Karten", percent: 66, color: "#f472b6", value: 8217 },
    { label: "Sealed", percent: 34, color: "#52525b", value: 4233 },
  ],
  set: [
    { label: "151", percent: 28, color: "#f472b6", value: 3480 },
    { label: "Evolving Skies", percent: 22, color: "#a78bfa", value: 2740 },
    { label: "Silver Tempest", percent: 18, color: "#67e8f9", value: 2240 },
    { label: "Promo / Sealed", percent: 20, color: "#fbbf24", value: 2490 },
    { label: "Sonstige", percent: 12, color: "#71717a", value: 1500 },
  ],
  language: [
    { label: "DE", percent: 58, color: "#f472b6", value: 7220 },
    { label: "EN", percent: 32, color: "#60a5fa", value: 3980 },
    { label: "JP", percent: 10, color: "#a3e635", value: 1250 },
  ],
  condition: [
    { label: "Near Mint", percent: 48, color: "#4ade80", value: 5980 },
    { label: "Mint", percent: 22, color: "#f472b6", value: 2740 },
    { label: "Excellent", percent: 18, color: "#fbbf24", value: 2240 },
    { label: "OVP / Sealed", percent: 12, color: "#a78bfa", value: 1490 },
  ],
};

/** ── Portfolio → Analyse tab ── */

export const portfolioAnalyseMetrics = {
  return1y: 21.0,
  winRate: 68,
  winnersCount: 632,
  totalAssets: 929,
  volatility: 8.4,
  maxDrawdown: -7.8,
  bestAssetClass: "Karten",
  bestAssetClassReturn: 31.5,
  strongestSet: "Nebula Chronicles",
  strongestSetReturn: 42.8,
  top5Share: 38,
  priceCoverage: 96,
};

export type ReturnSeriesPoint = {
  date: string;
  label: string;
  cards: number;
  sealed: number;
};

export const portfolioReturnSeries: ReturnSeriesPoint[] = [
  { date: "2023-06-01", label: "Jun '23", cards: -6, sealed: -8 },
  { date: "2023-07-01", label: "Jul '23", cards: -4, sealed: -5 },
  { date: "2023-08-01", label: "Aug '23", cards: -2, sealed: -3 },
  { date: "2023-09-01", label: "Sep '23", cards: 1, sealed: -1 },
  { date: "2023-10-01", label: "Okt '23", cards: 4, sealed: 2 },
  { date: "2023-11-01", label: "Nov '23", cards: 7, sealed: 4 },
  { date: "2023-12-01", label: "Dez '23", cards: 11, sealed: 6 },
  { date: "2024-01-01", label: "Jan '24", cards: 15, sealed: 8 },
  { date: "2024-02-01", label: "Feb '24", cards: 19, sealed: 10 },
  { date: "2024-03-15", label: "Mär '24", cards: 23.6, sealed: 12.7 },
  { date: "2024-04-01", label: "Apr '24", cards: 27, sealed: 16 },
  { date: "2024-05-01", label: "Mai '24", cards: 31.5, sealed: 19.2 },
];

export const portfolioWinLoss = {
  inPlus: 68,
  unchanged: 12,
  inMinus: 20,
  cards: { plus: 470, plusPct: 67, flat: 83, flatPct: 12, minus: 148, minusPct: 21 },
  sealed: { plus: 162, plusPct: 70, flat: 29, flatPct: 12, minus: 40, minusPct: 18 },
};

export type SetPerformanceRow = {
  id: string;
  name: string;
  assetType: "Karten" | "Sealed" | "Gemischt";
  market: number;
  profit: number;
  returnPct: number;
  sharePct: number;
  color: string;
};

export const portfolioSetPerformance: SetPerformanceRow[] = [
  {
    id: "s1",
    name: "Nebula Chronicles",
    assetType: "Karten",
    market: 2980,
    profit: 888,
    returnPct: 42.8,
    sharePct: 24,
    color: "#a78bfa",
  },
  {
    id: "s2",
    name: "Sturmfront",
    assetType: "Karten",
    market: 2210,
    profit: 620,
    returnPct: 38.9,
    sharePct: 18,
    color: "#60a5fa",
  },
  {
    id: "s3",
    name: "Lichtbringer",
    assetType: "Sealed",
    market: 1840,
    profit: 418,
    returnPct: 29.4,
    sharePct: 15,
    color: "#fbbf24",
  },
  {
    id: "s4",
    name: "Zeitzirkel",
    assetType: "Gemischt",
    market: 1420,
    profit: 232,
    returnPct: 19.5,
    sharePct: 11,
    color: "#f472b6",
  },
  {
    id: "s5",
    name: "Flammenbund",
    assetType: "Karten",
    market: 1120,
    profit: -76,
    returnPct: -6.4,
    sharePct: 9,
    color: "#f87171",
  },
  {
    id: "s6",
    name: "Nebelpfade",
    assetType: "Sealed",
    market: 880,
    profit: -124,
    returnPct: -12.3,
    sharePct: 7,
    color: "#a1a1aa",
  },
];

export const portfolioConcentration = {
  top5: 38,
  top10: 54,
  rest: 46,
  label: "Ausgewogen",
  note: "Keine einzelne Position dominiert dein Portfolio.",
  largestShare: 6.8,
  distinctAssets: 929,
};

export const portfolioReturnDistribution = [
  { label: "< −20 %", pct: 9, color: "#f87171" },
  { label: "−20 bis 0 %", pct: 11, color: "#fb7185" },
  { label: "0 bis 20 %", pct: 28, color: "#a1a1aa" },
  { label: "20 bis 50 %", pct: 34, color: "#4ade80" },
  { label: "> 50 %", pct: 18, color: "#22c55e" },
];

export type AnalyseAttributeRow = {
  id: string;
  label: string;
  flag?: string;
  market: number;
  returnPct: number;
  sharePct: number;
};

export const portfolioAnalyseByAttribute = {
  language: [
    { id: "de", label: "Deutsch", flag: "🇩🇪", market: 4280, returnPct: 19.1, sharePct: 34 },
    { id: "en", label: "Englisch", flag: "🇬🇧", market: 6120, returnPct: 22.7, sharePct: 49 },
    { id: "jp", label: "Japanisch", flag: "🇯🇵", market: 1350, returnPct: 16.3, sharePct: 11 },
    { id: "fr", label: "Französisch", flag: "🇫🇷", market: 700, returnPct: 12.4, sharePct: 6 },
  ] as AnalyseAttributeRow[],
  condition: [
    { id: "nm", label: "Near Mint", market: 5980, returnPct: 24.2, sharePct: 48 },
    { id: "m", label: "Mint", market: 2740, returnPct: 18.5, sharePct: 22 },
    { id: "ex", label: "Excellent", market: 2240, returnPct: 12.1, sharePct: 18 },
    { id: "ovp", label: "OVP / Sealed", market: 1490, returnPct: 19.8, sharePct: 12 },
  ] as AnalyseAttributeRow[],
  rarity: [
    { id: "sir", label: "Special Illustration", market: 4200, returnPct: 28.4, sharePct: 34 },
    { id: "aa", label: "Alternate Art", market: 3100, returnPct: 22.1, sharePct: 25 },
    { id: "ex", label: "ex / VMAX", market: 2800, returnPct: 18.6, sharePct: 22 },
    { id: "c", label: "Common / Uncommon", market: 2350, returnPct: 8.2, sharePct: 19 },
  ] as AnalyseAttributeRow[],
};

/** Full position rows for Gewinner & Verlierer → Positionen */
export type PositionStatus = "plus" | "flat" | "minus";

export type PortfolioPosition = {
  id: string;
  cardId: string;
  name: string;
  kind: "Karte" | "Sealed";
  setName: string;
  language: "DE" | "EN" | "JP" | "FR";
  condition: string;
  quantity: number;
  invested: number;
  market: number;
  profit: number;
  returnPct: number;
  status: PositionStatus;
  trend: number[];
};

function risingTrend(start: number, end: number, n = 10): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wave = Math.sin(i * 0.9) * (end - start) * 0.05;
    pts.push(start + (end - start) * t + wave);
  }
  pts[pts.length - 1] = end;
  return pts.map((v) => Math.round(v * 100) / 100);
}

export const portfolioPositionsList: PortfolioPosition[] = [
  {
    id: "p1",
    cardId: "charizard-ex",
    name: "Aurelia, Sternenruferin",
    kind: "Karte",
    setName: "Nebula Chronicles",
    language: "DE",
    condition: "Near Mint",
    quantity: 2,
    invested: 140,
    market: 280,
    profit: 140,
    returnPct: 100,
    status: "plus",
    trend: risingTrend(140, 280),
  },
  {
    id: "p2",
    cardId: "mew-ex",
    name: "Nebula Chronicles Display",
    kind: "Sealed",
    setName: "Nebula Chronicles",
    language: "DE",
    condition: "OVP",
    quantity: 1,
    invested: 160,
    market: 280,
    profit: 120,
    returnPct: 75,
    status: "plus",
    trend: risingTrend(160, 280),
  },
  {
    id: "p3",
    cardId: "giratina-v",
    name: "Vortex-Drache",
    kind: "Karte",
    setName: "Sturmfront",
    language: "DE",
    condition: "Near Mint",
    quantity: 1,
    invested: 85,
    market: 150,
    profit: 65,
    returnPct: 76.5,
    status: "plus",
    trend: risingTrend(85, 150),
  },
  {
    id: "p4",
    cardId: "pikachu-promo",
    name: "Lichtbringer Trainer Box",
    kind: "Sealed",
    setName: "Lichtbringer",
    language: "DE",
    condition: "OVP",
    quantity: 2,
    invested: 100,
    market: 180,
    profit: 80,
    returnPct: 80,
    status: "plus",
    trend: risingTrend(100, 180),
  },
  {
    id: "p5",
    cardId: "umbreon-v",
    name: "Chronomant",
    kind: "Karte",
    setName: "Zeitzirkel",
    language: "EN",
    condition: "Mint",
    quantity: 3,
    invested: 75,
    market: 135,
    profit: 60,
    returnPct: 80,
    status: "plus",
    trend: risingTrend(75, 135),
  },
  {
    id: "p6",
    cardId: "lugia-v",
    name: "Mechanischer Leviathan",
    kind: "Karte",
    setName: "Zeitzirkel",
    language: "DE",
    condition: "Near Mint",
    quantity: 1,
    invested: 60,
    market: 106,
    profit: 46,
    returnPct: 76.7,
    status: "plus",
    trend: risingTrend(60, 106),
  },
  {
    id: "p7",
    cardId: "rayquaza-vmax",
    name: "Flammenphönix",
    kind: "Karte",
    setName: "Flammenbund",
    language: "DE",
    condition: "Near Mint",
    quantity: 2,
    invested: 70,
    market: 120,
    profit: 50,
    returnPct: 71.4,
    status: "plus",
    trend: risingTrend(70, 120),
  },
  {
    id: "p8",
    cardId: "lugia-vstar",
    name: "Sturmfront Booster Bundle",
    kind: "Sealed",
    setName: "Sturmfront",
    language: "DE",
    condition: "OVP",
    quantity: 1,
    invested: 45,
    market: 76,
    profit: 31,
    returnPct: 68.9,
    status: "plus",
    trend: risingTrend(45, 76),
  },
  {
    id: "p9",
    cardId: "koraidon-ex",
    name: "Schattenassassine",
    kind: "Karte",
    setName: "Nebelpfade",
    language: "JP",
    condition: "Excellent",
    quantity: 4,
    invested: 80,
    market: 132,
    profit: 52,
    returnPct: 65,
    status: "plus",
    trend: risingTrend(80, 132),
  },
  {
    id: "p10",
    cardId: "gardevoir-ex",
    name: "Nebelpfade Display",
    kind: "Sealed",
    setName: "Nebelpfade",
    language: "DE",
    condition: "OVP",
    quantity: 1,
    invested: 120,
    market: 190,
    profit: 70,
    returnPct: 58.3,
    status: "plus",
    trend: risingTrend(120, 190),
  },
  {
    id: "p11",
    cardId: "pikachu-151",
    name: "Pikachu 151",
    kind: "Karte",
    setName: "Pokémon 151",
    language: "DE",
    condition: "Near Mint",
    quantity: 2,
    invested: 40,
    market: 40,
    profit: 0,
    returnPct: 0,
    status: "flat",
    trend: risingTrend(40, 40),
  },
  {
    id: "p12",
    cardId: "blastoise",
    name: "Turtok Promo",
    kind: "Karte",
    setName: "Pokémon 151",
    language: "EN",
    condition: "Near Mint",
    quantity: 1,
    invested: 25,
    market: 22,
    profit: -3,
    returnPct: -12,
    status: "minus",
    trend: risingTrend(25, 22),
  },
];

export const portfolioPositionsSummary = {
  plus: 632,
  flat: 111,
  minus: 186,
  all: 929,
  plusPct: 68,
  totalProfitPlus: 3184,
  avgReturnPlus: 24.6,
  pricesUpdatedLabel: "heute, 06:00 Uhr",
};


export const databaseCards = [
  "charizard-ex",
  "mew-ex",
  "pikachu-151",
  "gardevoir-ex",
  "koraidon-ex",
  "lugia-v",
  "magikarp",
  "umbreon-v",
  "rayquaza-vmax",
  "pikachu-promo",
  "giratina-v",
  "lugia-vstar",
];

export const set151Cards = [
  "bulbasaur",
  "ivysaur",
  "venusaur",
  "charmander",
  "charmeleon",
  "charizard-ex",
  "squirtle",
  "wartortle",
  "blastoise",
  "pikachu-151",
  "ralts",
  "mew-ex",
  "gardevoir-ex",
  "koraidon-ex",
  "magikarp",
];

export const missingCards151 = [
  { name: "Kangaskhan ex", price: 3.2 },
  { name: "Fullart Erika", price: 5.1 },
  { name: "Giovanni's Charisma", price: 6.8 },
];

export const rarityBreakdown = [
  { label: "Standard", percent: 90, color: "#3b82f6" },
  { label: "Reverse Holo", percent: 82, color: "#06b6d4" },
  { label: "Holo", percent: 75, color: "#22c55e" },
  { label: "Ultra Rare", percent: 45, color: "#f97316" },
  { label: "Special Illustration", percent: 12, color: "#d9779a" },
];


export type SealedCategory =
  | "Display"
  | "Elite Trainer Box"
  | "Booster Bundle"
  | "Kollektion"
  | "Tin"
  | "Blister";

export type SealedProduct = {
  id: string;
  name: string;
  setName: string;
  category: SealedCategory;
  language: "DE" | "EN" | "JP";
  condition: "OVP" | "OVP – leichte Mängel" | "Geöffnet";
  quantity: number;
  purchasePrice: number;
  marketValue: number;
  /** Set logo / product art */
  imageUrl?: string;
  imageFallbacks?: string[];
  ean?: string;
};

const sealedProductsRaw: Omit<SealedProduct, "imageUrl" | "imageFallbacks">[] = [
  {
    id: "sp1",
    name: "Stellarkrone Booster Display",
    setName: "Stellarkrone",
    category: "Display",
    language: "DE",
    condition: "OVP",
    quantity: 2,
    purchasePrice: 110,
    marketValue: 156,
    ean: "4001234567890",
  },
  {
    id: "sp2",
    name: "Paradoxrift Top-Trainer-Box",
    setName: "Paradoxrift",
    category: "Elite Trainer Box",
    language: "EN",
    condition: "OVP",
    quantity: 1,
    purchasePrice: 65,
    marketValue: 98,
    ean: "4001234567891",
  },
  {
    id: "sp3",
    name: "Temporal Forces Booster Bundle",
    setName: "Temporal Forces",
    category: "Booster Bundle",
    language: "DE",
    condition: "OVP",
    quantity: 4,
    purchasePrice: 27.5,
    marketValue: 38,
    ean: "4001234567892",
  },
  {
    id: "sp4",
    name: "Pokémon 151 Kollektion",
    setName: "151",
    category: "Kollektion",
    language: "DE",
    condition: "OVP",
    quantity: 2,
    purchasePrice: 45,
    marketValue: 64,
    ean: "4001234567893",
  },
  {
    id: "sp5",
    name: "Maskerade im Zwielicht Tin",
    setName: "Maskerade im Zwielicht",
    category: "Tin",
    language: "EN",
    condition: "OVP – leichte Mängel",
    quantity: 3,
    purchasePrice: 12,
    marketValue: 14.5,
    ean: "4001234567894",
  },
  {
    id: "sp6",
    name: "Entwicklungen in Paldea Blister",
    setName: "Entwicklungen in Paldea",
    category: "Blister",
    language: "JP",
    condition: "OVP",
    quantity: 5,
    purchasePrice: 4,
    marketValue: 3.2,
    ean: "4001234567895",
  },
  {
    id: "sp7",
    name: "Stürmische Funken Display",
    setName: "Stürmische Funken",
    category: "Display",
    language: "DE",
    condition: "OVP",
    quantity: 1,
    purchasePrice: 95,
    marketValue: 119,
    ean: "4001234567896",
  },
  {
    id: "sp8",
    name: "Silberne Sturmwinde Booster Box",
    setName: "Silberne Sturmwinde",
    category: "Display",
    language: "DE",
    condition: "OVP",
    quantity: 2,
    purchasePrice: 88,
    marketValue: 105,
    ean: "4001234567897",
  },
  {
    id: "sp9",
    name: "Karmesin & Purpur Top-Trainer-Box",
    setName: "Karmesin & Purpur",
    category: "Elite Trainer Box",
    language: "DE",
    condition: "OVP",
    quantity: 3,
    purchasePrice: 42,
    marketValue: 51,
    ean: "4001234567898",
  },
  {
    id: "sp10",
    name: "Nebel der Sagen Bundle",
    setName: "Nebel der Sagen",
    category: "Booster Bundle",
    language: "EN",
    condition: "OVP",
    quantity: 6,
    purchasePrice: 22,
    marketValue: 29,
    ean: "4001234567899",
  },
  {
    id: "sp11",
    name: "Obsidianflammen Tin",
    setName: "Obsidianflammen",
    category: "Tin",
    language: "DE",
    condition: "OVP",
    quantity: 4,
    purchasePrice: 15,
    marketValue: 18,
    ean: "4001234567900",
  },
  {
    id: "sp12",
    name: "Verlorener Ursprung Blister",
    setName: "Verlorener Ursprung",
    category: "Blister",
    language: "EN",
    condition: "OVP",
    quantity: 8,
    purchasePrice: 5.5,
    marketValue: 6.2,
    ean: "4001234567901",
  },
];

export const sealedProducts: SealedProduct[] = sealedProductsRaw.map((p) => {
  const imgs = getDemoSealedImages(p.id);
  return {
    ...p,
    imageUrl: imgs.imageUrl,
    imageFallbacks: imgs.imageFallbacks,
  };
});

export function getSealedMetrics(products: SealedProduct[] = sealedProducts) {
  const productCount = products.length;
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
  const totalValue = products.reduce((s, p) => s + p.marketValue * p.quantity, 0);
  const invested = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);
  const profitLoss = totalValue - invested;
  const sets = new Set(products.map((p) => p.setName)).size;
  const avgValue = productCount ? totalValue / productCount : 0;
  return {
    productCount,
    totalUnits,
    totalValue,
    invested,
    profitLoss,
    sets,
    avgValue,
    weeklyChange: 3.2,
    returnRate: invested ? (profitLoss / invested) * 100 : 0,
    pricesUpdatedLabel: "heute, 06:00 Uhr",
  };
}


export function getCard(id: string): Card {
  return cards[id];
}

export function getProfit(row: CollectionRow): number {
  return row.marketValue - row.purchasePrice;
}

export function getProfitPercent(row: CollectionRow): number {
  if (row.purchasePrice === 0) return 0;
  return ((row.marketValue - row.purchasePrice) / row.purchasePrice) * 100;
}

export function formatRowProfit(row: CollectionRow): string {
  return formatChange(getProfit(row));
}