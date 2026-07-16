/**
 * Map demo/slug IDs → TCGdex set ids used by /sets/[id] and the local cache.
 * Without this, dashboard “Set-Fortschritt” links like /sets/151 404.
 */
export const SET_ID_ALIASES: Record<string, string> = {
  "151": "sv03.5",
  "pokemon-151": "sv03.5",
  "sv3pt5": "sv03.5",
  "paldean-fates": "sv04.5",
  "sv4pt5": "sv04.5",
  "obsidian-flames": "sv03",
  sv3: "sv03",
  "paradox-rift": "sv04",
  sv4: "sv04",
  "temporal-forces": "sv05",
  sv5: "sv05",
  "twilight-masquerade": "sv06",
  sv6: "sv06",
  "shrouded-fable": "sv06.5",
  sv6pt5: "sv06.5",
  "stellar-crown": "sv07",
  sv7: "sv07",
  "surging-sparks": "sv08",
  sv8: "sv08",
  "prismatic-evolutions": "sv08.5",
  sv8pt5: "sv08.5",
  "journey-together": "sv09",
  sv9: "sv09",
  "destined-rivals": "sv10",
  "sword-shield": "swsh1",
  "scarlet-violet": "sv01",
  sv1: "sv01",
};

/** Canonical TCGdex id for routing / API */
export function resolveSetId(setId: string): string {
  return SET_ID_ALIASES[setId] ?? setId;
}

export function setDetailPath(setId: string): string {
  return `/sets/${encodeURIComponent(resolveSetId(setId))}`;
}

export function parseSetIdFromSegments(segments: string[]): string {
  const raw = decodeURIComponent(segments.join("/"));
  return resolveSetId(raw);
}