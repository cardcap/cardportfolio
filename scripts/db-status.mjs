/**
 * Prüft, ob DATABASE_URL gesetzt ist und Prisma die DB erreichen kann.
 * Nutzung: npm run db:status
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL?.trim() ?? "";

function maskUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    if (raw.startsWith("file:")) return raw;
    return raw.slice(0, 24) + "…";
  }
}

async function main() {
  console.log("CardCap DB-Status");
  console.log("─────────────────");

  if (!url) {
    console.log("✗ DATABASE_URL fehlt");
    console.log("  → .env setzen oder: docker compose -f docker-compose.db.yml up -d");
    process.exit(1);
  }

  console.log(`• DATABASE_URL: ${maskUrl(url)}`);

  if (url.startsWith("file:")) {
    console.log("⚠ SQLite-Datei (nur Dev-Fallback). Production braucht PostgreSQL.");
    console.log("  Empfohlen lokal:");
    console.log('  DATABASE_URL="postgresql://cardcap:cardcap@localhost:5432/cardcap"');
  } else if (!url.startsWith("postgres")) {
    console.log("✗ Unbekanntes DB-Protokoll (erwartet postgres… oder file:…)");
    process.exit(1);
  } else {
    console.log("• Provider: PostgreSQL");
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ Verbindung OK");

    const [users, collection, sealed, wishlist] = await Promise.all([
      prisma.user.count(),
      prisma.collectionItem.count(),
      prisma.sealedItem.count().catch(() => null),
      prisma.wishlistItem.count(),
    ]);

    console.log(`• User:            ${users}`);
    console.log(`• CollectionItems: ${collection}`);
    console.log(
      `• SealedItems:     ${sealed === null ? "(Schema noch nicht migriert)" : sealed}`,
    );
    console.log(`• WishlistItems:   ${wishlist}`);
    console.log("✓ Schema erreichbar");
  } catch (error) {
    console.log("✗ Verbindung / Schema fehlgeschlagen:");
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
    console.log("");
    console.log("Tipps:");
    console.log("  1. docker compose -f docker-compose.db.yml up -d");
    console.log("  2. DATABASE_URL in .env auf Postgres setzen");
    console.log("  3. npm run db:migrate");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
