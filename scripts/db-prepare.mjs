import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// Prefer direct (non-pooled) URL for migrations (Neon)
const databaseUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || "";

if (!databaseUrl.startsWith("postgres")) {
  console.log(
    "db-prepare: Keine PostgreSQL-URL, Schema-Migration übersprungen.",
  );
  process.exit(0);
}

// Ensure Prisma migrate uses the direct connection when available
if (process.env.DIRECT_URL?.trim()) {
  process.env.DATABASE_URL = process.env.DIRECT_URL.trim();
}

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const hasMigrations =
  existsSync(migrationsDir) &&
  existsSync(path.join(migrationsDir, "migration_lock.toml"));

try {
  if (hasMigrations) {
    console.log("db-prepare: prisma migrate deploy …");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  } else {
    console.log("db-prepare: keine migrations/, fallback prisma db push …");
    execSync("npx prisma db push", { stdio: "inherit" });
  }
  execSync("node scripts/ensure-admin.mjs", { stdio: "inherit" });
} catch (error) {
  console.error("db-prepare: fehlgeschlagen", error);
  process.exit(1);
}