#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const API_BASE = "https://api.tcgdex.net/v2";
const LANGS = ["de", "en", "fr", "es", "it", "ja"];
const CONCURRENCY = 25;

const COLOR_TOKEN_ALIASES = {
  grass: "Pflanze",
  pflanze: "Pflanze",
  plante: "Pflanze",
  planta: "Pflanze",
  erba: "Pflanze",
  fire: "Feuer",
  feuer: "Feuer",
  feu: "Feuer",
  fuego: "Feuer",
  fuoco: "Feuer",
  water: "Wasser",
  wasser: "Wasser",
  eau: "Wasser",
  agua: "Wasser",
  acqua: "Wasser",
  lightning: "Elektro",
  elektro: "Elektro",
  électrique: "Elektro",
  rayo: "Elektro",
  lampo: "Elektro",
  psychic: "Psycho",
  psycho: "Psycho",
  psy: "Psycho",
  psíquica: "Psycho",
  fighting: "Kampf",
  kampf: "Kampf",
  combat: "Kampf",
  lucha: "Kampf",
  lotta: "Kampf",
  darkness: "Finsternis",
  finsternis: "Finsternis",
  obscurité: "Finsternis",
  oscuridad: "Finsternis",
  oscurità: "Finsternis",
  metal: "Metall",
  metall: "Metall",
  métal: "Metall",
  steel: "Metall",
  metallo: "Metall",
  fairy: "Fee",
  fee: "Fee",
  fée: "Fee",
  hada: "Fee",
  folletto: "Fee",
  dragon: "Drache",
  drache: "Drache",
  dragón: "Drache",
  drago: "Drache",
  colorless: "Farblos",
  farblos: "Farblos",
  incolore: "Farblos",
  incolora: "Farblos",
};

const ENERGY_PATTERN = /energie|energy|énergie|energía|energia|エネルギー/i;

function normalizeColor(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  return COLOR_TOKEN_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

function parseEnergyColors(name) {
  const colors = new Set();
  const lower = name.toLowerCase();

  for (const [alias, color] of Object.entries(COLOR_TOKEN_ALIASES)) {
    if (lower.includes(alias)) colors.add(color);
  }

  const compact = name.replace(/\s+/g, "");
  const glued = compact.match(/^([A-Za-zäöüÄÖÜß]+)(?:Energie|Energy)$/i);
  if (glued?.[1]) {
    const color = normalizeColor(glued[1]);
    if (color) colors.add(color);
  }

  const hyphen = name.match(/^([A-Za-zäöüÄÖÜß]+)-/);
  if (hyphen?.[1] && ENERGY_PATTERN.test(name)) {
    const color = normalizeColor(hyphen[1]);
    if (color) colors.add(color);
  }

  return [...colors];
}

function isEnergyCard(card) {
  return card.category === "Energie" ||
    card.category === "Energy" ||
    ENERGY_PATTERN.test(card.name);
}

async function fetchCardDetail(lang, cardId) {
  const res = await fetch(`${API_BASE}/${lang}/cards/${cardId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function patchLanguage(lang) {
  const filePath = path.join(DATA_DIR, "cards", `${lang}.json`);
  if (!fs.existsSync(filePath)) return;

  const file = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const cards = file.cards;
  const missing = cards.filter((card) => !card.types?.length);
  let done = 0;

  console.log(`\n🎨 Typen ergänzen: ${lang} (${missing.length} Karten)`);

  for (const card of cards) {
    if (card.types?.length) continue;

    if (isEnergyCard(card)) {
      card.types = parseEnergyColors(card.name);
      if (!card.category) card.category = "Energie";
      continue;
    }
  }

  const stillMissing = cards.filter((card) => !card.types?.length && !isEnergyCard(card));
  const queue = [...stillMissing];

  async function worker() {
    while (queue.length) {
      const card = queue.shift();
      if (!card) break;

      const detail = await fetchCardDetail(lang, card.id);
      if (detail) {
        card.category = detail.category ?? card.category;
        if (detail.types?.length) {
          card.types = detail.types;
        } else if (detail.category === "Energie" || detail.category === "Energy") {
          card.category = detail.category;
          card.types = parseEnergyColors(detail.name);
        }
      }

      done++;
      if (done % 200 === 0 || done === stillMissing.length) {
        process.stdout.write(`\r   ${done}/${stillMissing.length} von API geladen`);
      }
    }
  }

  if (stillMissing.length) {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log("");
  }

  file.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(file));
  const withTypes = cards.filter((card) => card.types?.length).length;
  console.log(`   ✓ ${withTypes}/${cards.length} Karten mit Farbe/Type`);
}

async function main() {
  const onlyLang = process.argv.find((arg) => arg.startsWith("--lang="))?.split("=")[1];
  const langs = onlyLang ? LANGS.filter((lang) => lang === onlyLang) : LANGS;

  if (!langs.length) {
    console.error(`Unbekannte Sprache: ${onlyLang}`);
    process.exit(1);
  }

  for (const lang of langs) {
    await patchLanguage(lang);
  }

  console.log("\nFertig.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});