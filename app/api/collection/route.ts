import { requireSessionUserId } from "@/lib/api-auth";
import { isCardCondition } from "@/lib/card-conditions";
import {
  addCardToCollection,
  getUserCollection,
} from "@/lib/collection-service";
import {
  DEFAULT_LANGUAGE,
  isCardLanguage,
} from "@/lib/tcgdex-constants";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const data = await getUserCollection(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Collection API error:", error);
    return NextResponse.json(
      { error: "Sammlung konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      tcgCardId?: string;
      language?: string;
      condition?: string;
      quantity?: number;
    };

    if (!body.tcgCardId?.trim()) {
      return NextResponse.json(
        { error: "Karten-ID fehlt." },
        { status: 400 },
      );
    }

    const langParam = body.language ?? DEFAULT_LANGUAGE;
    const lang = isCardLanguage(langParam) ? langParam : DEFAULT_LANGUAGE;
    const condition =
      body.condition && isCardCondition(body.condition)
        ? body.condition
        : "Near Mint";

    const item = await addCardToCollection(userId, {
      tcgCardId: body.tcgCardId.trim(),
      language: lang,
      condition: condition === "Alle Zustände" ? "Near Mint" : condition,
      quantity: body.quantity,
    });

    if (!item) {
      return NextResponse.json(
        { error: "Karte nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Collection add error:", error);
    return NextResponse.json(
      { error: "Karte konnte nicht hinzugefügt werden." },
      { status: 500 },
    );
  }
}