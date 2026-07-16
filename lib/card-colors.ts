import type { CardLanguage } from "@/lib/tcgdex-constants";
import { COLORS_BY_LANG } from "@/lib/tcgdex-constants";

export type CardColorSource = {
  name: string;
  types?: string[];
  category?: string;
};

type ColorKey =
  | "grass"
  | "fire"
  | "water"
  | "lightning"
  | "psychic"
  | "fighting"
  | "darkness"
  | "metal"
  | "fairy"
  | "dragon"
  | "colorless";

const FILTER_LABEL_TO_KEY: Record<CardLanguage, Record<string, ColorKey>> = {
  de: {
    Pflanze: "grass",
    Feuer: "fire",
    Wasser: "water",
    Elektro: "lightning",
    Psycho: "psychic",
    Kampf: "fighting",
    Finsternis: "darkness",
    Metall: "metal",
    Fee: "fairy",
    Drache: "dragon",
    Farblos: "colorless",
  },
  en: {
    Grass: "grass",
    Fire: "fire",
    Water: "water",
    Lightning: "lightning",
    Psychic: "psychic",
    Fighting: "fighting",
    Darkness: "darkness",
    Metal: "metal",
    Fairy: "fairy",
    Dragon: "dragon",
    Colorless: "colorless",
  },
  fr: {
    Plante: "grass",
    Feu: "fire",
    Eau: "water",
    Électrique: "lightning",
    Psy: "psychic",
    Combat: "fighting",
    Obscurité: "darkness",
    Métal: "metal",
    Fée: "fairy",
    Dragon: "dragon",
    Incolore: "colorless",
  },
  es: {
    Planta: "grass",
    Fuego: "fire",
    Agua: "water",
    Rayo: "lightning",
    Psíquica: "psychic",
    Lucha: "fighting",
    Oscuridad: "darkness",
    Metal: "metal",
    Hada: "fairy",
    Dragón: "dragon",
    Incolora: "colorless",
  },
  it: {
    Erba: "grass",
    Fuoco: "fire",
    Acqua: "water",
    Lampo: "lightning",
    Psico: "psychic",
    Lotta: "fighting",
    Oscurità: "darkness",
    Metallo: "metal",
    Folletto: "fairy",
    Drago: "dragon",
    Incolore: "colorless",
  },
  ja: {
    草: "grass",
    炎: "fire",
    水: "water",
    雷: "lightning",
    超: "psychic",
    闘: "fighting",
    悪: "darkness",
    鋼: "metal",
    妖: "fairy",
    ドラゴン: "dragon",
    無色: "colorless",
  },
};

const TOKEN_TO_KEY: Record<string, ColorKey> = {
  grass: "grass",
  pflanze: "grass",
  plante: "grass",
  planta: "grass",
  erba: "grass",
  草: "grass",
  fire: "fire",
  feuer: "fire",
  feu: "fire",
  fuego: "fire",
  fuoco: "fire",
  炎: "fire",
  water: "water",
  wasser: "water",
  eau: "water",
  agua: "water",
  acqua: "water",
  水: "water",
  lightning: "lightning",
  elektro: "lightning",
  elektroenergie: "lightning",
  électrique: "lightning",
  rayo: "lightning",
  lampo: "lightning",
  雷: "lightning",
  psychic: "psychic",
  psycho: "psychic",
  psy: "psychic",
  psíquica: "psychic",
  超: "psychic",
  fighting: "fighting",
  kampf: "fighting",
  combat: "fighting",
  lucha: "fighting",
  lotta: "fighting",
  闘: "fighting",
  darkness: "darkness",
  finsternis: "darkness",
  obscurité: "darkness",
  oscuridad: "darkness",
  oscurità: "darkness",
  悪: "darkness",
  metal: "metal",
  metall: "metal",
  métal: "metal",
  metallo: "metal",
  steel: "metal",
  鋼: "metal",
  fairy: "fairy",
  fee: "fairy",
  fée: "fairy",
  hada: "fairy",
  folletto: "fairy",
  妖: "fairy",
  dragon: "dragon",
  drache: "dragon",
  dragón: "dragon",
  drago: "dragon",
  ドラゴン: "dragon",
  colorless: "colorless",
  farblos: "colorless",
  incolore: "colorless",
  incolora: "colorless",
  無色: "colorless",
};

const ENERGY_NAME_PATTERN =
  /energie|energy|énergie|energía|energia|エネルギー/i;

export function isAllColorsFilter(value: string, lang: CardLanguage): boolean {
  return !value || value === COLORS_BY_LANG[lang][0];
}

export function resolveColorFilterKey(
  color: string,
  lang: CardLanguage,
): ColorKey | null {
  if (isAllColorsFilter(color, lang)) return null;
  return FILTER_LABEL_TO_KEY[lang][color] ?? null;
}

export function resolveColorForTcgdexApi(
  color: string,
  lang: CardLanguage,
): string {
  return color;
}

function tokenToColorKey(token: string): ColorKey | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const direct = TOKEN_TO_KEY[trimmed.toLowerCase()];
  if (direct) return direct;

  return TOKEN_TO_KEY[trimmed] ?? null;
}

function addColorKey(keys: Set<ColorKey>, token: string): void {
  const key = tokenToColorKey(token);
  if (key) keys.add(key);
}

export function parseEnergyColorsFromName(name: string): ColorKey[] {
  const keys = new Set<ColorKey>();
  const lower = name.toLowerCase();

  for (const [alias, key] of Object.entries(TOKEN_TO_KEY)) {
    if (alias.length > 2 && lower.includes(alias.toLowerCase())) {
      keys.add(key);
    }
  }

  const compact = name.replace(/\s+/g, "");
  const gluedMatch = compact.match(
    /^([A-Za-zäöüÄÖÜß\u3040-\u30ff\u4e00-\u9faf]+)(?:Energie|Energy)$/i,
  );
  if (gluedMatch?.[1]) {
    addColorKey(keys, gluedMatch[1]);
  }

  const hyphenMatch = name.match(/^([A-Za-zäöüÄÖÜß\u3040-\u30ff\u4e00-\u9faf]+)-/);
  if (hyphenMatch?.[1] && ENERGY_NAME_PATTERN.test(name)) {
    addColorKey(keys, hyphenMatch[1]);
  }

  return [...keys];
}

export function isEnergyCard(card: CardColorSource): boolean {
  if (card.category === "Energie" || card.category === "Energy") return true;
  return ENERGY_NAME_PATTERN.test(card.name);
}

export function getCardColorKeys(
  card: CardColorSource,
  lang: CardLanguage,
): ColorKey[] {
  const keys = new Set<ColorKey>();

  if (card.types?.length) {
    for (const type of card.types) {
      const fromLabel = FILTER_LABEL_TO_KEY[lang][type];
      if (fromLabel) {
        keys.add(fromLabel);
        continue;
      }
      addColorKey(keys, type);
    }
  }

  if (keys.size === 0 && isEnergyCard(card)) {
    return parseEnergyColorsFromName(card.name);
  }

  return [...keys];
}

/** Soft RGB glow tints for hover pulse (subtle, not neon) */
const GLOW_RGB: Record<ColorKey, string> = {
  grass: "74, 222, 128",
  fire: "248, 113, 113",
  water: "96, 165, 250",
  lightning: "250, 204, 21",
  psychic: "192, 132, 252",
  fighting: "251, 146, 60",
  darkness: "129, 140, 248",
  metal: "161, 161, 170",
  fairy: "244, 114, 182",
  dragon: "167, 139, 250",
  colorless: "212, 212, 216",
};

/**
 * CSS-ready glow color for card hover. Uses first energy type when available.
 * `types` may be DE/EN labels (Pflanze, Fire, …).
 */
export function getCardGlowColor(
  types?: string[] | null,
  fallback = "232, 160, 191",
): string {
  if (!types?.length) return `rgba(${fallback}, 0.45)`;
  for (const t of types) {
    const key =
      tokenToColorKey(t) ??
      FILTER_LABEL_TO_KEY.de[t] ??
      FILTER_LABEL_TO_KEY.en[t] ??
      null;
    if (key && GLOW_RGB[key]) {
      return `rgba(${GLOW_RGB[key]}, 0.45)`;
    }
  }
  return `rgba(${fallback}, 0.45)`;
}

/** @deprecated Nutze getCardColorKeys – für Anzeige in der UI-Sprache */
export function getCardColors(card: CardColorSource, lang: CardLanguage): string[] {
  const labels = COLORS_BY_LANG[lang].slice(1);
  const keys = getCardColorKeys(card, lang);
  return labels.filter((label) => {
    const key = FILTER_LABEL_TO_KEY[lang][label];
    return key != null && keys.includes(key);
  });
}

export function cardMatchesColor(
  card: CardColorSource,
  color: string,
  lang: CardLanguage,
): boolean {
  const filterKey = resolveColorFilterKey(color, lang);
  if (!filterKey) return true;

  const cardKeys = getCardColorKeys(card, lang);
  return cardKeys.includes(filterKey);
}