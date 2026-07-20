import { requireSessionUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId || userId === "site-gate-admin") {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            collectionItems: true,
            sealedItems: true,
            wishlistItems: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Benutzer nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      counts: {
        collectionItems: user._count.collectionItems,
        sealedItems: user._count.sealedItems,
        wishlistItems: user._count.wishlistItems,
      },
    });
  } catch (error) {
    console.error("GET /api/user/me", error);
    return NextResponse.json(
      { error: "Profil konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId || userId === "site-gate-admin") {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
    };

    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, 80) : undefined;

    if (name === undefined) {
      return NextResponse.json(
        { error: "Keine gültigen Felder." },
        { status: 400 },
      );
    }

    if (name.length < 1) {
      return NextResponse.json(
        { error: "Name darf nicht leer sein." },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH /api/user/me", error);
    return NextResponse.json(
      { error: "Profil konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
