#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractPricing } from "./pricing-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
];

const PAGE_SIZE = 500;
const ENRICH_CONCURRENCY = 20;
const API_BASE = "https://api.tcgdex.net/v2";

function extractSetId(cardId) {
  const dash = cardId.lastIndexOf("-");
  return dash > 0 ? cardId.slice(0, dash) : cardId;
}

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(500 * attempt);
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function enrichSet(lang, set) {
  const detail = await fetchJson(`${API_BASE}/${lang}/sets/${set.id}`).catch(
    () => null,
  );
  return {
    id: set.id,
    name: set.name,
    logo: detail?.logo ?? set.logo,
    symbol: detail?.symbol ?? set.symbol,
    serieId: detail?.serie?.id,
    releaseDate: detail?.releaseDate,
    cardCount: set.cardCount,
  };
}

async function downloadSets(lang) {
  console.log(`\n📦 Sets laden: ${lang}`);
  const rawSets = await fetchJson(`${API_BASE}/${lang}/sets`);
  const sets = [];
  const queue = [...rawSets];

  async function worker() {
    while (queue.length) {
      const set = queue.shift();
      if (set) sets.push(await enrichSet(lang, set));
    }
  }

  await Promise.all(
    Array.from({ length: 15 }, worker),
  );

  const outDir = path.join(DATA_DIR, "sets");
  fs.mkdirSync(outDir, { recursive: true });
  const file = {
    updatedAt: new Date().toISOString(),
    lang,
    sets,
  };
  fs.writeFileSync(path.join(outDir, `${lang}.json`), JSON.stringify(file));
  console.log(`   ✓ ${sets.length} Sets gespeichert`);
  return sets;
}

async function downloadBriefCards(lang) {
  console.log(`\n🃏 Karten laden: ${lang}`);
  const cards = [];
  let page = 1;

  while (true) {
    const url = `${API_BASE}/${lang}/cards?pagination:page=${page}&pagination:itemsPerPage=${PAGE_SIZE}`;
    const batch = await fetchJson(url);
    if (!batch.length) break;

    for (const c of batch) {
      cards.push({
        id: c.id,
        localId: c.localId,
        name: c.name,
        image: c.image,
        setId: extractSetId(c.id),
      });
    }

    process.stdout.write(`\r   Seite ${page} – ${cards.length} Karten`);
    if (batch.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`\n   ✓ ${cards.length} Karten (Basisdaten)`);
  return cards;
}

async function enrichCards(lang, cards) {
  const missing = cards.filter((c) => !c.rarity);
  if (!missing.length) return cards;

  console.log(`\n🔍 Details laden (${lang}): ${missing.length} Karten`);
  let done = 0;

  function parseEnergyColors(name) {
  const colors = new Set();
  const lower = name.toLowerCase();
  const aliases = {
    grass: "Pflanze", pflanze: "Pflanze", fire: "Feuer", feuer: "Feuer",
    water: "Wasser", wasser: "Wasser", lightning: "Elektro", elektro: "Elektro",
    psychic: "Psycho", psycho: "Psycho", fighting: "Kampf", kampf: "Kampf",
    darkness: "Finsternis", finsternis: "Finsternis", metal: "Metall", metall: "Metall",
    fairy: "Fee", fee: "Fee", dragon: "Drache", drache: "Drache", colorless: "Farblos", farblos: "Farblos",
  };
  for (const [alias, color] of Object.entries(aliases)) {
    if (lower.includes(alias)) colors.add(color);
  }
  const glued = name.replace(/\s+/g, "").match(/^([A-Za-zäöüÄÖÜß]+)(?:Energie|Energy)$/i);
  if (glued?.[1]) {
    const color = aliases[glued[1].toLowerCase()] ?? glued[1];
    if (color) colors.add(color);
  }
  return [...colors];
}

async function enrichOne(card) {
    try {
      const detail = await fetchJson(`${API_BASE}/${lang}/cards/${card.id}`);
      card.rarity = detail.rarity;
      card.category = detail.category;
      if (detail.types?.length) {
        card.types = detail.types;
      } else if (detail.category === "Energie" || detail.category === "Energy" || /energie|energy/i.test(detail.name)) {
        card.types = parseEnergyColors(detail.name);
      }
      const pricing = extractPricing(detail);
      if (pricing) card.pricing = pricing;
    } catch {
      // Einzelne Fehler überspringen
    } finally {
      done++;
      if (done % 100 === 0 || done === missing.length) {
        process.stdout.write(`\r   ${done}/${missing.length} angereichert`);
      }
    }
  }

  const queue = [...missing];
  const workers = Array.from({ length: ENRICH_CONCURRENCY }, async () => {
    while (queue.length) {
      const card = queue.shift();
      if (card) await enrichOne(card);
    }
  });

  await Promise.all(workers);
  console.log("");
  return cards;
}

function saveCards(lang, cards) {
  const outDir = path.join(DATA_DIR, "cards");
  fs.mkdirSync(outDir, { recursive: true });
  const file = {
    updatedAt: new Date().toISOString(),
    lang,
    cards,
  };
  fs.writeFileSync(path.join(outDir, `${lang}.json`), JSON.stringify(file));
  console.log(`   ✓ Gespeichert: data/cards/${lang}.json`);
}

async function downloadLanguage(lang) {
  await downloadSets(lang);
  let cards = await downloadBriefCards(lang);

  const enrich = !process.argv.includes("--no-enrich");
  if (enrich) {
    cards = await enrichCards(lang, cards);
  }

  saveCards(lang, cards);
}

async function main() {
  const onlyLang = process.argv.find((a) => a.startsWith("--lang="))?.split("=")[1];

  console.log("═══════════════════════════════════════════");
  console.log("  CardPortfolio – Kartendaten-Download");
  console.log("  Quelle: TCGdex API");
  console.log("═══════════════════════════════════════════");

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const langs = onlyLang
    ? LANGUAGES.filter((l) => l.code === onlyLang)
    : LANGUAGES;

  if (!langs.length) {
    console.error(`Unbekannte Sprache: ${onlyLang}`);
    process.exit(1);
  }

  for (const { code, label } of langs) {
    console.log(`\n━━━ ${label} (${code}) ━━━`);
    await downloadLanguage(code);
  }

  console.log("\n✅ Download abgeschlossen!");
}

main().catch((err) => {
  console.error("\n❌ Fehler:", err);
  process.exit(1);
});