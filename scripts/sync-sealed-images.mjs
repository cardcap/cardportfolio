/**
 * Sync real sealed product photos from TCGCSV (TCGPlayer catalog).
 *
 * Usage: node scripts/sync-sealed-images.mjs
 * Writes: data/sealed-product-images.json
 *
 * No scraping of Amazon / Pokemon Center — uses public TCGPlayer CDN URLs
 * redistributed via tcgcsv.com product catalog.
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../data/sealed-product-images.json");

const SET_TO_GROUP = {
  sv01: 22873,
  sv02: 23120,
  sv03: 23228,
  "sv03.5": 23237,
  sv04: 23286,
  "sv04.5": 23353,
  sv05: 23381,
  sv06: 23473,
  "sv06.5": 23529,
  sv07: 23537,
  sv08: 23651,
  "sv08.5": 23821,
  sv09: 24073,
  sv10: 24269,
  "sv10.5b": 24325,
  "sv10.5w": 24326,
  me01: 24380,
  me02: 24448,
  "me02.5": 24541,
  me03: 24587,
  me04: 24655,
  swsh9: 2948,
  swsh10: 3040,
  swsh11: 3118,
  swsh12: 3170,
  "swsh12.5": 17688,
};

const PRODUCT_RULES = [
  {
    type: "Booster Display",
    includes: ["booster box"],
    excludes: ["case", "half", "japanese", "korean", "chinese", "code card"],
  },
  {
    type: "Top-Trainer-Box",
    includes: ["elite trainer box"],
    excludes: [
      "case",
      "pokemon center",
      "pokémon center",
      "code card",
      "japanese",
    ],
  },
  {
    type: "Booster Bundle",
    includes: ["booster bundle"],
    excludes: ["case", "code card"],
  },
  {
    type: "Tin",
    tin: true,
    excludes: ["case", "code card"],
  },
  {
    type: "Blister",
    includes: ["blister"],
    excludes: ["case", "code card", "premium checklane"],
  },
  {
    type: "Kollektion",
    includes: [
      "collection",
      "premium collection",
      "special collection",
      "illustration collection",
      "ultra-premium",
      "ultra premium",
      "build & battle stadium",
      "trainer's toolkit",
    ],
    excludes: ["case", "code card", "first partner"],
  },
];

async function get(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CardCap/1.0 (sealed image sync)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function classify(name) {
  const n = name.toLowerCase();
  if (n.includes("code card")) return null;
  for (const rule of PRODUCT_RULES) {
    if (rule.excludes.some((ex) => n.includes(ex))) continue;
    if (rule.tin) {
      if (/\btin\b/.test(n)) return rule.type;
      continue;
    }
    if (rule.includes.some((inc) => n.includes(inc))) return rule.type;
  }
  return null;
}

function hiRes(productId) {
  const pid = String(productId);
  return [
    `https://tcgplayer-cdn.tcgplayer.com/product/${pid}_in_1000x1000.jpg`,
    `https://tcgplayer-cdn.tcgplayer.com/product/${pid}_400w.jpg`,
    `https://tcgplayer-cdn.tcgplayer.com/product/${pid}_200w.jpg`,
    `https://product-images.tcgplayer.com/fit-in/800x800/${pid}.jpg`,
  ];
}

async function main() {
  const groupsList = (await get("https://tcgcsv.com/tcgplayer/3/groups")).results;
  const groups = Object.fromEntries(groupsList.map((g) => [g.groupId, g]));

  for (const g of groupsList) {
    const n = g.name;
    const ab = (g.abbreviation || "").toUpperCase();
    const byAb = {
      SSH: "swsh1",
      RCL: "swsh2",
      DAA: "swsh3",
      VIV: "swsh4",
      BST: "swsh5",
      CRE: "swsh6",
      EVS: "swsh7",
      FST: "swsh8",
      BRS: "swsh9",
      ASR: "swsh10",
      LOR: "swsh11",
      SIT: "swsh12",
      CRZ: "swsh12.5",
    };
    if (
      byAb[ab] &&
      !n.toLowerCase().includes("trainer gallery") &&
      !n.toLowerCase().includes("galarian gallery")
    ) {
      SET_TO_GROUP[byAb[ab]] = g.groupId;
    }
    if (n.startsWith("SWSH01:")) SET_TO_GROUP.swsh1 = g.groupId;
    if (n.startsWith("SWSH02:")) SET_TO_GROUP.swsh2 = g.groupId;
    if (n.startsWith("SWSH03:")) SET_TO_GROUP.swsh3 = g.groupId;
    if (n.startsWith("SWSH04:")) SET_TO_GROUP.swsh4 = g.groupId;
    if (n.startsWith("SWSH05:")) SET_TO_GROUP.swsh5 = g.groupId;
    if (n.startsWith("SWSH06:")) SET_TO_GROUP.swsh6 = g.groupId;
    if (n.startsWith("SWSH07:")) SET_TO_GROUP.swsh7 = g.groupId;
    if (n.startsWith("SWSH08:")) SET_TO_GROUP.swsh8 = g.groupId;
  }

  const bySet = {};
  for (const [setId, groupId] of Object.entries(SET_TO_GROUP).sort()) {
    if (!groupId || !groups[groupId]) {
      console.warn("skip", setId, groupId);
      continue;
    }
    let prods;
    try {
      prods = (await get(`https://tcgcsv.com/tcgplayer/3/${groupId}/products`))
        .results;
    } catch (e) {
      console.warn("err", setId, e.message);
      continue;
    }

    const products = {};
    for (const p of prods) {
      const type = classify(p.name || "");
      if (!type || products[type]) continue;
      const urls = hiRes(p.productId);
      products[type] = {
        productId: p.productId,
        name: p.name,
        imageUrl: urls[0],
        imageFallbacks: urls.slice(1),
      };
    }

    const def =
      products["Booster Display"] ||
      products["Top-Trainer-Box"] ||
      Object.values(products)[0];

    bySet[setId] = {
      groupId,
      groupName: groups[groupId].name,
      products,
      ...(def
        ? {
            default: {
              productId: def.productId,
              name: def.name,
              imageUrl: def.imageUrl,
              imageFallbacks: def.imageFallbacks,
            },
          }
        : {}),
    };
    console.log(
      "OK",
      setId.padEnd(8),
      groups[groupId].name.slice(0, 40).padEnd(40),
      Object.keys(products).join(", ") || "-",
    );
  }

  const out = {
    _meta: {
      source: "tcgcsv.com (TCGPlayer catalog images)",
      note: "Real sealed product photos — not set logos. Regenerated by scripts/sync-sealed-images.mjs",
      generatedAt: new Date().toISOString(),
    },
    bySet,
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log("Wrote", OUT, "sets=", Object.keys(bySet).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
