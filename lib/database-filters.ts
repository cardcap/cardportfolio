import { isCardCondition } from "@/lib/card-conditions";
import { RARITY_FILTER_ALL } from "@/lib/rarity-labels";
import {
  DEFAULT_LANGUAGE,
  isCardLanguage,
  type CardLanguage,
} from "@/lib/tcgdex-constants";

const STORAGE_KEY = "cardcap-database-filters";
const STORAGE_KEY_LEGACY = "cardportfolio-database-filters";

export type DatabaseFilters = {
  language: CardLanguage;
  search: string;
  setFilter: string;
  rarityFilter: string;
  colorFilter: string;
  grayNotOwned: boolean;
  conditionFilter: string;
};

const DEFAULT_FILTERS: DatabaseFilters = {
  language: DEFAULT_LANGUAGE,
  search: "",
  setFilter: "",
  rarityFilter: "",
  colorFilter: "",
  grayNotOwned: false,
  conditionFilter: "Alle Zustände",
};

export function loadDatabaseFilters(): DatabaseFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;

  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!raw) return DEFAULT_FILTERS;

    const parsed = JSON.parse(raw) as Partial<DatabaseFilters>;
    const lang = parsed.language ?? "";
    return {
      language: isCardLanguage(lang) ? lang : DEFAULT_LANGUAGE,
      search: typeof parsed.search === "string" ? parsed.search : "",
      setFilter: typeof parsed.setFilter === "string" ? parsed.setFilter : "",
      rarityFilter:
        typeof parsed.rarityFilter === "string"
          ? parsed.rarityFilter === "Alle Seltenheiten"
            ? RARITY_FILTER_ALL
            : parsed.rarityFilter
          : "",
      colorFilter:
        typeof parsed.colorFilter === "string" ? parsed.colorFilter : "",
      grayNotOwned: parsed.grayNotOwned === true,
      conditionFilter:
        typeof parsed.conditionFilter === "string" &&
        isCardCondition(parsed.conditionFilter)
          ? parsed.conditionFilter
          : "Alle Zustände",
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function saveDatabaseFilters(filters: DatabaseFilters): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}