import { requireSessionUserId } from "@/lib/api-auth";
import {
  addSealedItem,
  getUserSealed,
  openSealedUnit,
  removeSealedItem,
  seedDemoSealedIfEmpty,
  updateSealedItem,
  type CreateSealedParams,
} from "@/lib/sealed-service";
import { getDemoSealedSetId } from "@/lib/sealed-images";
import { sealedProducts } from "@/lib/mock-data";
import { NextRequest, NextResponse } from "next/server";

function demoSeedParams(): CreateSealedParams[] {
  return sealedProducts.map((p) => ({
    productKey: p.id,
    name: p.name,
    setId: getDemoSealedSetId(p.id),
    setName: p.setName,
    category: p.category,
    language: p.language,
    condition: p.condition,
    quantity: p.quantity,
    purchasePrice: p.purchasePrice,
    marketValue: p.marketValue,
    imageUrl: p.imageUrl ?? null,
    imageFallbacks: p.imageFallbacks ?? null,
    ean: p.ean ?? null,
  }));
}

export async function GET(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const seed = request.nextUrl.searchParams.get("seed") === "1";
    if (seed) {
      const items = await seedDemoSealedIfEmpty(userId, demoSeedParams());
      const { metrics } = await getUserSealed(userId);
      return NextResponse.json({ items, metrics });
    }

    const data = await getUserSealed(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Sealed GET error:", error);
    return NextResponse.json(
      { error: "Sealed-Inventar konnte nicht geladen werden." },
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
    const body = (await request.json()) as CreateSealedParams & {
      action?: string;
      id?: string;
    };

    // Special action: open sealed unit (remove 1 / delete)
    if (body.action === "open" && body.id?.trim()) {
      const items = await openSealedUnit(userId, body.id.trim());
      return NextResponse.json({ items });
    }

    if (!body.productKey?.trim() || !body.name?.trim() || !body.setName?.trim()) {
      return NextResponse.json(
        { error: "productKey, name und setName sind erforderlich." },
        { status: 400 },
      );
    }
    if (typeof body.purchasePrice !== "number" || body.purchasePrice < 0) {
      return NextResponse.json(
        { error: "purchasePrice fehlt oder ist ungültig." },
        { status: 400 },
      );
    }

    const item = await addSealedItem(userId, {
      productKey: body.productKey.trim(),
      name: body.name.trim(),
      setId: body.setId,
      setName: body.setName.trim(),
      category: body.category || "Display",
      language: body.language,
      condition: body.condition,
      quantity: body.quantity,
      purchasePrice: body.purchasePrice,
      marketValue: body.marketValue,
      imageUrl: body.imageUrl,
      imageFallbacks: body.imageFallbacks,
      ean: body.ean,
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Sealed POST error:", error);
    return NextResponse.json(
      { error: "Sealed-Produkt konnte nicht angelegt werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      quantity?: number;
      condition?: string;
      language?: string;
      category?: string;
      purchasePrice?: number;
      purchaseDate?: string | null;
      marketValue?: number | null;
    };

    if (!body.id?.trim()) {
      return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
    }

    const item = await updateSealedItem(userId, body.id.trim(), {
      quantity: body.quantity,
      condition: body.condition,
      language: body.language,
      category: body.category,
      purchasePrice: body.purchasePrice,
      purchaseDate: body.purchaseDate,
      marketValue: body.marketValue,
    });

    if (!item) {
      return NextResponse.json(
        { error: "Eintrag nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("Sealed PATCH error:", error);
    return NextResponse.json(
      { error: "Sealed-Produkt konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id?.trim()) {
      return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
    }

    const ok = await removeSealedItem(userId, body.id.trim());
    if (!ok) {
      return NextResponse.json(
        { error: "Eintrag nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sealed DELETE error:", error);
    return NextResponse.json(
      { error: "Sealed-Produkt konnte nicht entfernt werden." },
      { status: 500 },
    );
  }
}
