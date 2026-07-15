#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "set-codes.json");

async function fetchAllSets() {
  const sets = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.pokemontcg.io/v2/sets?page=${page}&pageSize=250`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`pokemontcg.io ${res.status}`);
    const json = await res.json();
    sets.push(...json.data);
    if (page >= json.totalCount / json.pageSize) break;
    page++;
  }

  return sets;
}

async function main() {
  const remote = await fetchAllSets();
  const codes = {};

  for (const set of remote) {
    codes[set.id] = {
      code: set.ptcgoCode || set.id.toUpperCase(),
      printedTotal: set.printedTotal ?? set.total ?? null,
    };
  }

  fs.writeFileSync(
    OUT,
    JSON.stringify({ updatedAt: new Date().toISOString(), codes }, null, 0),
  );
  console.log(`✓ ${Object.keys(codes).length} Set-Codes → data/set-codes.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});