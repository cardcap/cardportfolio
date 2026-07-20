import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — App- und DB-Status (ohne Secrets).
 */
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const hasPostgres = databaseUrl.startsWith("postgres");
  const hasSqlite = databaseUrl.startsWith("file:");

  let db: "ok" | "error" | "skipped" = "skipped";
  let dbError: string | undefined;
  let counts:
    | { users: number; collectionItems: number; sealedItems: number | null }
    | undefined;

  if (hasPostgres || hasSqlite) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const [users, collectionItems, sealedItems] = await Promise.all([
        prisma.user.count(),
        prisma.collectionItem.count(),
        prisma.sealedItem.count().catch(() => null),
      ]);
      counts = { users, collectionItems, sealedItems };
      db = "ok";
    } catch (error) {
      db = "error";
      dbError = error instanceof Error ? error.message : "unknown";
    }
  }

  const ok = db === "ok" || db === "skipped";
  return NextResponse.json(
    {
      ok,
      app: "cardcap",
      time: new Date().toISOString(),
      database: {
        configured: Boolean(databaseUrl),
        type: hasPostgres ? "postgresql" : hasSqlite ? "sqlite" : "none",
        status: db,
        error: dbError,
        counts,
      },
      auth: {
        secretConfigured: Boolean(process.env.AUTH_SECRET?.trim()),
      },
    },
    { status: ok ? 200 : 503 },
  );
}
