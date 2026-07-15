import type { CardLanguage } from "@/lib/tcgdex-constants";

export const RARITY_FILTER_ALL = "All Rarities";

/** Englische Anzeige- und Filterwerte für Seltenheiten */
export const RARITY_FILTER_OPTIONS = [
  RARITY_FILTER_ALL,
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Rare Holo LV.X",
  "Rare PRIME",
  "Double Rare",
  "Ultra Rare",
  "Illustration Rare",
  "Special Illustration Rare",
  "Hyper Rare",
  "Mega Hyper Rare",
  "Secret Rare",
  "Radiant Rare",
  "Holo Rare",
  "Holo Rare V",
  "Holo Rare VMAX",
  "Holo Rare VSTAR",
  "Shiny Rare",
  "Shiny Rare V",
  "Shiny Rare VMAX",
  "Shiny Ultra Rare",
  "ACE SPEC Rare",
  "Amazing Rare",
  "Full Art Trainer",
  "Crown",
  "Black White Rare",
  "Classic Collection",
  "LEGEND",
  "One Star",
  "Two Star",
  "Three Star",
  "One Diamond",
  "Two Diamond",
  "Three Diamond",
  "Four Diamond",
  "One Shiny",
  "Two Shiny",
  "Promo",
  "None",
] as const;

const LOCALIZED_TO_ENGLISH: Record<string, string> = {
  // Deutsch
  Häufig: "Common",
  Ungewöhnlich: "Uncommon",
  Selten: "Rare",
  "Selten, Holografisch": "Rare Holo",
  "Selten, Holografisch LV.X": "Rare Holo LV.X",
  "selten, Primus": "Rare PRIME",
  Doppelselten: "Double Rare",
  "Ultra Selten": "Ultra Rare",
  "Selten, Illustration": "Illustration Rare",
  "Selten, besondere Illustration": "Special Illustration Rare",
  Hyperselten: "Hyper Rare",
  "Mega Hyper Selten": "Mega Hyper Rare",
  "Versteckt Selten": "Secret Rare",
  "Selten, Strahlend": "Radiant Rare",
  "Holografisch Selten": "Holo Rare",
  "Holografisch Selten V": "Holo Rare V",
  "Holografisch Selten VMAX": "Holo Rare VMAX",
  "Holografisch Selten VSTAR": "Holo Rare VSTAR",
  "Shiny rare": "Shiny Rare",
  "Shiny rare V": "Shiny Rare V",
  "Shiny rare VMAX": "Shiny Rare VMAX",
  "ultraselten, Schillernd": "Shiny Ultra Rare",
  "ASS-KLASSE": "ACE SPEC Rare",
  Atemberaubend: "Amazing Rare",
  Vollkunsttrainer: "Full Art Trainer",
  Couronne: "Crown",
  "Schwarz-Weiß Selten": "Black White Rare",
  LEGENDE: "LEGEND",
  "Une Étoile": "One Star",
  "deux Étoiles": "Two Star",
  "Trois Étoiles": "Three Star",
  "Une Diamant": "One Diamond",
  "deux Diamant": "Two Diamond",
  "Trois Diamant": "Three Diamond",
  "Quatre Diamant": "Four Diamond",
  "Un Chromatique": "One Shiny",
  "Deux Chromatique": "Two Shiny",
  Keine: "None",
  Promo: "Promo",

  // English (identity)
  Common: "Common",
  Uncommon: "Uncommon",
  Rare: "Rare",
  "Rare Holo": "Rare Holo",
  "Rare Holo LV.X": "Rare Holo LV.X",
  "Rare PRIME": "Rare PRIME",
  "Double rare": "Double Rare",
  "Ultra Rare": "Ultra Rare",
  "Illustration rare": "Illustration Rare",
  "Special illustration rare": "Special Illustration Rare",
  "Hyper rare": "Hyper Rare",
  "Mega Hyper Rare": "Mega Hyper Rare",
  "Secret Rare": "Secret Rare",
  "Radiant Rare": "Radiant Rare",
  "Holo Rare": "Holo Rare",
  "Holo Rare V": "Holo Rare V",
  "Holo Rare VMAX": "Holo Rare VMAX",
  "Holo Rare VSTAR": "Holo Rare VSTAR",
  "Shiny Ultra Rare": "Shiny Ultra Rare",
  "ACE SPEC Rare": "ACE SPEC Rare",
  "Amazing Rare": "Amazing Rare",
  "Full Art Trainer": "Full Art Trainer",
  Crown: "Crown",
  "Black White Rare": "Black White Rare",
  "Classic Collection": "Classic Collection",
  LEGEND: "LEGEND",
  "One Star": "One Star",
  "Two Star": "Two Star",
  "Three Star": "Three Star",
  "One Diamond": "One Diamond",
  "Two Diamond": "Two Diamond",
  "Three Diamond": "Three Diamond",
  "Four Diamond": "Four Diamond",
  "One Shiny": "One Shiny",
  "Two Shiny": "Two Shiny",
  None: "None",

  // Français (nur sprachspezifische Bezeichnungen)
  Commune: "Common",
  "Peu Commune": "Uncommon",
  "Rare Prime": "Rare PRIME",
  "Illustration spéciale rare": "Special Illustration Rare",
  "Radieux Rare": "Radiant Rare",
  "Dresseur Full Art": "Full Art Trainer",
  "Rare Noir Blanc": "Black White Rare",
  "Collection Classique": "Classic Collection",
  LÉGENDE: "LEGEND",
  "Deux Étoiles": "Two Star",
  "Deux Diamants": "Two Diamond",
  "Trois Diamants": "Three Diamond",
  "Quatre Diamants": "Four Diamond",
  "Deux Chromatiques": "Two Shiny",
  "Sans Rareté": "None",
  Magnifique: "Amazing Rare",
  "Magnifique rare": "Amazing Rare",
  "HIGH-TECG rare": "ACE SPEC Rare",
  "Chromatique ultra rare": "Shiny Ultra Rare",
  "Méga Hyper Rare": "Mega Hyper Rare",
};

const ENGLISH_TO_LOCAL: Record<CardLanguage, Partial<Record<string, string>>> = {
  de: {
    Common: "Häufig",
    Uncommon: "Ungewöhnlich",
    Rare: "Selten",
    "Rare Holo": "Selten, Holografisch",
    "Rare Holo LV.X": "Selten, Holografisch LV.X",
    "Rare PRIME": "selten, Primus",
    "Double Rare": "Doppelselten",
    "Ultra Rare": "Ultra Selten",
    "Illustration Rare": "Selten, Illustration",
    "Special Illustration Rare": "Selten, besondere Illustration",
    "Hyper Rare": "Hyperselten",
    "Mega Hyper Rare": "Mega Hyper Selten",
    "Secret Rare": "Versteckt Selten",
    "Radiant Rare": "Selten, Strahlend",
    "Holo Rare": "Holografisch Selten",
    "Holo Rare V": "Holografisch Selten V",
    "Holo Rare VMAX": "Holografisch Selten VMAX",
    "Holo Rare VSTAR": "Holografisch Selten VSTAR",
    "Shiny Rare": "Shiny rare",
    "Shiny Rare V": "Shiny rare V",
    "Shiny Rare VMAX": "Shiny rare VMAX",
    "Shiny Ultra Rare": "ultraselten, Schillernd",
    "ACE SPEC Rare": "ASS-KLASSE",
    "Amazing Rare": "Atemberaubend",
    "Full Art Trainer": "Vollkunsttrainer",
    Crown: "Couronne",
    "Black White Rare": "Schwarz-Weiß Selten",
    LEGEND: "LEGENDE",
    "One Star": "Une Étoile",
    "Two Star": "deux Étoiles",
    "Three Star": "Trois Étoiles",
    "One Diamond": "Une Diamant",
    "Two Diamond": "deux Diamant",
    "Three Diamond": "Trois Diamant",
    "Four Diamond": "Quatre Diamant",
    "One Shiny": "Un Chromatique",
    "Two Shiny": "Deux Chromatique",
    None: "Keine",
    Promo: "Promo",
  },
  en: {
    Common: "Common",
    Uncommon: "Uncommon",
    Rare: "Rare",
    "Rare Holo": "Rare Holo",
    "Rare Holo LV.X": "Rare Holo LV.X",
    "Rare PRIME": "Rare PRIME",
    "Double Rare": "Double rare",
    "Ultra Rare": "Ultra Rare",
    "Illustration Rare": "Illustration rare",
    "Special Illustration Rare": "Special illustration rare",
    "Hyper Rare": "Hyper rare",
    "Mega Hyper Rare": "Mega Hyper Rare",
    "Secret Rare": "Secret Rare",
    "Radiant Rare": "Radiant Rare",
    "Holo Rare": "Holo Rare",
    "Holo Rare V": "Holo Rare V",
    "Holo Rare VMAX": "Holo Rare VMAX",
    "Holo Rare VSTAR": "Holo Rare VSTAR",
    "Shiny Rare": "Shiny rare",
    "Shiny Rare V": "Shiny rare V",
    "Shiny Rare VMAX": "Shiny rare VMAX",
    "Shiny Ultra Rare": "Shiny Ultra Rare",
    "ACE SPEC Rare": "ACE SPEC Rare",
    "Amazing Rare": "Amazing Rare",
    "Full Art Trainer": "Full Art Trainer",
    Crown: "Crown",
    "Black White Rare": "Black White Rare",
    "Classic Collection": "Classic Collection",
    LEGEND: "LEGEND",
    "One Star": "One Star",
    "Two Star": "Two Star",
    "Three Star": "Three Star",
    "One Diamond": "One Diamond",
    "Two Diamond": "Two Diamond",
    "Three Diamond": "Three Diamond",
    "Four Diamond": "Four Diamond",
    "One Shiny": "One Shiny",
    "Two Shiny": "Two Shiny",
    None: "None",
    Promo: "Promo",
  },
  fr: {
    Common: "Commune",
    Uncommon: "Peu Commune",
    Rare: "Rare",
    "Rare Holo": "Rare Holo",
    "Rare Holo LV.X": "Rare Holo LV.X",
    "Rare PRIME": "Rare Prime",
    "Double Rare": "Double rare",
    "Ultra Rare": "Ultra Rare",
    "Illustration Rare": "Illustration rare",
    "Special Illustration Rare": "Illustration spéciale rare",
    "Hyper Rare": "Hyper rare",
    "Mega Hyper Rare": "Méga Hyper Rare",
    "Radiant Rare": "Radieux Rare",
    "Holo Rare": "Holo Rare",
    "Holo Rare V": "Holo Rare V",
    "Holo Rare VMAX": "Holo Rare VMAX",
    "Holo Rare VSTAR": "Holo Rare VSTAR",
    "Shiny Rare": "Shiny rare",
    "Shiny Rare V": "Shiny rare V",
    "Shiny Rare VMAX": "Shiny rare VMAX",
    "Shiny Ultra Rare": "Chromatique ultra rare",
    "Full Art Trainer": "Dresseur Full Art",
    Crown: "Couronne",
    "Black White Rare": "Rare Noir Blanc",
    "Classic Collection": "Collection Classique",
    LEGEND: "LÉGENDE",
    "One Star": "Une Étoile",
    "Two Star": "Deux Étoiles",
    "Three Star": "Trois Étoiles",
    "One Diamond": "Un Diamant",
    "Two Diamond": "Deux Diamants",
    "Three Diamond": "Trois Diamants",
    "Four Diamond": "Quatre Diamants",
    "One Shiny": "Un Chromatique",
    "Two Shiny": "Deux Chromatiques",
    "Amazing Rare": "Magnifique rare",
    "ACE SPEC Rare": "HIGH-TECG rare",
    None: "Sans Rareté",
    Promo: "Promo",
  },
  es: {},
  it: {},
  ja: {
    Common: "Common",
    Uncommon: "Uncommon",
    Rare: "Rare",
    "Rare Holo": "Rare Holo",
    "Double Rare": "Double Rare",
    "Ultra Rare": "Ultra Rare",
    "Special Illustration Rare": "Special Illustration Rare",
    "Hyper Rare": "Hyper Rare",
    None: "None",
    Promo: "Promo",
  },
};

export function isAllRaritiesFilter(value: string): boolean {
  return (
    !value ||
    value === RARITY_FILTER_ALL ||
    value === "Alle Seltenheiten"
  );
}

export function formatRarityEnglish(rarity?: string | null): string {
  if (!rarity) return "—";
  return LOCALIZED_TO_ENGLISH[rarity] ?? rarity;
}

export function localizedRaritiesForEnglishFilter(
  englishRarity: string,
  lang: CardLanguage,
): string[] {
  const primary = ENGLISH_TO_LOCAL[lang]?.[englishRarity];
  const matches = new Set<string>();

  if (primary) matches.add(primary);

  for (const [localized, english] of Object.entries(LOCALIZED_TO_ENGLISH)) {
    if (english === englishRarity) matches.add(localized);
  }

  if (!matches.size) matches.add(englishRarity);
  return [...matches];
}

export function resolveRarityForApi(
  englishRarity: string,
  lang: CardLanguage,
): string {
  return (
    ENGLISH_TO_LOCAL[lang]?.[englishRarity] ??
    localizedRaritiesForEnglishFilter(englishRarity, lang)[0] ??
    englishRarity
  );
}

export function cardMatchesEnglishRarity(
  rarity: string | undefined,
  englishFilter: string,
  lang: CardLanguage,
): boolean {
  if (!rarity) return false;
  if (isAllRaritiesFilter(englishFilter)) return true;

  if (formatRarityEnglish(rarity) === englishFilter) return true;

  const localizedMatches = localizedRaritiesForEnglishFilter(
    englishFilter,
    lang,
  );
  return localizedMatches.includes(rarity);
}