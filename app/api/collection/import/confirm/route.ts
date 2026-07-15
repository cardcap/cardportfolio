import { requireSessionUserId } from "@/lib/api-auth";
import {
  importCollectionRows,
  type ConfirmImportRow,
} from "@/lib/collection-service";
import { NextRequest, NextResponse } from "next/server";

type ConfirmBody = {
  rows?: ConfirmImportRow[];
};

export async function POST(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ConfirmBody;
    const rows = (body.rows ?? []).filter(
      (row) => row.tcgCardId && row.quantity > 0,
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Zeilen zum Importieren." },
        { status: 400 },
      );
    }

    const result = await importCollectionRows(userId, rows);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Collection import error:", error);
    return NextResponse.json(
      { error: "Import fehlgeschlagen." },
      { status: 500 },
    );
  }
}