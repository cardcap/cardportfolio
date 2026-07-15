#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const API_BASE = "https://api.tcgdex.net/v2";
const LANGS = ["de", "en", "fr", "es", "it", "ja"];
const CONCURRENCY = 15;

async function fetchSetDetail(lang, setId) {
  const res = await fetch(`${API_BASE}/${lang}/sets/${setId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function patchLanguage(lang) {
  const filePath = path.join(DATA_DIR, "sets", `${lang}.json`);
  if (!fs.existsSync(filePath)) return;

  const file = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const queue = [...file.sets];
  let done = 0;

  async function worker() {
    while (queue.length) {
      const set = queue.shift();
      if (!set) break;

      const detail = await fetchSetDetail(lang, set.id);
      if (detail) {
        set.serieId = detail.serie?.id ?? set.serieId;
        set.releaseDate = detail.releaseDate ?? set.releaseDate;
        set.logo = detail.logo ?? set.logo;
        set.symbol = detail.symbol ?? set.symbol;
      }

      done++;
      if (done % 25 === 0 || done === file.sets.length) {
        process.stdout.write(`\r   ${lang}: ${done}/${file.sets.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  file.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(file));
  console.log(`\n   ✓ ${lang} Sets angereichert`);
}

async function main() {
  console.log("Set-Metadaten (Serie, Release) werden ergänzt…");
  for (const lang of LANGS) {
    await patchLanguage(lang);
  }
  console.log("Fertig.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});