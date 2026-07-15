#!/usr/bin/env node
/**
 * Tägliche Preisaktualisierung über die TCGdex API (Cardmarket EUR / TCGplayer USD).
 *
 * Cron-Beispiel (täglich 6:00 Uhr):
 *   0 6 * * * cd /home/bngh/cardportfolio && npm run update-prices >> /var/log/cardcap-prices.log 2>&1
 *
 * Optionen:
 *   --lang=de     Nur eine Sprache
 *   --limit=100   Nur erste N Karten (zum Testen)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractPricing } from "./pricing-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const API_BASE = "https://api.tcgdex.net/v2";

const LANGUAGES = ["de", "en", "fr", "es", "it", "ja"];
const CONCURRENCY = 25;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCardDetail(lang, cardId, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/${lang}/cards/${cardId}`, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 429) {
        await sleep(1000 * attempt);
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      if (attempt === retries) return null;
      await sleep(500 * attempt);
    }
  }
  return null;
}

async function updateLanguage(lang, limit) {
  const filePath = path.join(DATA_DIR, "cards", `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠ Keine Datei für ${lang}, übersprungen`);
    return { updated: 0, withPrice: 0, total: 0 };
  }

  const file = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const cards = limit ? file.cards.slice(0, limit) : file.cards;
  const total = cards.length;
  let done = 0;
  let priced = 0;

  console.log(`\n💰 Preise aktualisieren: ${lang} (${total} Karten)`);

  async function updateOne(card) {
    const detail = await fetchCardDetail(lang, card.id);
    const pricing = detail ? extractPricing(detail) : null;

    if (detail) {
      card.category = detail.category ?? card.category;
      if (detail.types?.length) {
        card.types = detail.types;
      }
    }

    if (pricing) {
      card.pricing = pricing;
      priced++;
    } else {
      delete card.pricing;
    }

    done++;
    if (done % 200 === 0 || done === total) {
      process.stdout.write(`\r   ${done}/${total} · ${priced} mit Preis`);
    }
  }

  const queue = [...cards];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const card = queue.shift();
        if (card) await updateOne(card);
      }
    }),
  );

  file.pricesUpdatedAt = new Date().toISOString();
  file.updatedAt = file.pricesUpdatedAt;
  fs.writeFileSync(filePath, JSON.stringify(file));

  console.log(`\n   ✓ ${priced}/${total} Karten mit Preis gespeichert`);
  return { updated: priced, withPrice: priced, total };
}

async function main() {
  const onlyLang = process.argv.find((a) => a.startsWith("--lang="))?.split("=")[1];
  const limitArg = process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const limit = limitArg ? Number(limitArg) : undefined;

  console.log("═══════════════════════════════════════════");
  console.log("  CardCap – Preis-Update (TCGdex)");
  console.log("  Quellen: Cardmarket (EUR), TCGplayer (USD)");
  console.log("═══════════════════════════════════════════");

  const langs = onlyLang
    ? LANGUAGES.filter((l) => l === onlyLang)
    : LANGUAGES;

  if (!langs.length) {
    console.error(`Unbekannte Sprache: ${onlyLang}`);
    process.exit(1);
  }

  const started = Date.now();
  let grandTotal = 0;
  let grandPriced = 0;

  for (const lang of langs) {
    const result = await updateLanguage(lang, limit);
    grandTotal += result.total;
    grandPriced += result.withPrice;
  }

  const minutes = ((Date.now() - started) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Fertig: ${grandPriced}/${grandTotal} Karten mit Preis (${minutes} min)`);
}

main().catch((err) => {
  console.error("\n❌ Fehler:", err);
  process.exit(1);
});