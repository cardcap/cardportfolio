import { execSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl.startsWith("postgres")) {
  console.log("db-prepare: Keine PostgreSQL-URL, Schema-Migration übersprungen.");
  process.exit(0);
}

execSync("npx prisma db push", { stdio: "inherit" });
execSync("node scripts/ensure-admin.mjs", { stdio: "inherit" });