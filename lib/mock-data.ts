import { formatChange, formatCurrency } from "./format";

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
  uniqueCards: 892,
  duplicates: 353,
  wishlistCount: 34,
  wishlistValue: 542,
  avgPurchasePrice: 7.88,
  bestCard: { name: "Glurak ex", value: 850 },
  weeklyChange: 3.2,
};

export const portfolioHistory = [
  { label: "15. Mai", value: 8200 },
  { label: "22. Mai", value: 9100 },
  { label: "29. Mai", value: 9800 },
  { label: "5. Jun", value: 11200 },
  { label: "12. Jun", value: 12100 },
  { label: "19. Jun", value: 12450 },
];

export const portfolioAllocation = [
  { label: "151", percent: 42, color: "#d9779a" },
  { label: "Paldean Fates", percent: 25, color: "#8b5cf6" },
  { label: "Prismatic", percent: 18, color: "#06b6d4" },
  { label: "Surging", percent: 15, color: "#22c55e" },
];

export const setProgress = [
  { setId: "151", owned: 192, total: 207 },
  { setId: "paldean-fates", owned: 162, total: 225 },
  { setId: "temporal-forces", owned: 84, total: 167 },
];

export const topPerformers = [
  { cardId: "charizard-ex", change: 22.4 },
  { cardId: "pikachu-promo", change: 18.7 },
  { cardId: "mew-ex", change: 15.3 },
];

export const topLosers = [
  { cardId: "koraidon-ex", change: -11.2 },
  { cardId: "gardevoir-ex", change: -8.4 },
  { cardId: "lugia-vstar", change: -6.1 },
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