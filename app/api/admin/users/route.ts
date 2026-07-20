import bcrypt from "bcryptjs";
import { requireAdminUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const adminId = await requireAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Keine Admin-Berechtigung." }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            collectionItems: true,
            sealedItems: true,
            wishlistItems: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        counts: {
          collectionItems: u._count.collectionItems,
          sealedItems: u._count.sealedItems,
          wishlistItems: u._count.wishlistItems,
        },
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/users", error);
    return NextResponse.json(
      { error: "Benutzerliste konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const adminId = await requireAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Keine Admin-Berechtigung." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      role?: "USER" | "ADMIN";
      name?: string;
      resetPassword?: string;
    };

    if (!body.id?.trim()) {
      return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
    }

    const id = body.id.trim();
    if (id === adminId && body.role === "USER") {
      return NextResponse.json(
        { error: "Du kannst dir selbst die Admin-Rolle nicht entziehen." },
        { status: 400 },
      );
    }

    const data: {
      role?: "USER" | "ADMIN";
      name?: string;
      password?: string;
    } = {};

    if (body.role === "USER" || body.role === "ADMIN") {
      data.role = body.role;
    }
    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim().slice(0, 80);
    }
    if (typeof body.resetPassword === "string" && body.resetPassword.length >= 8) {
      data.password = await bcrypt.hash(body.resetPassword, 12);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Felder." },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("PATCH /api/admin/users", error);
    return NextResponse.json(
      { error: "Benutzer konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const adminId = await requireAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Keine Admin-Berechtigung." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id?.trim()) {
      return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
    }

    const id = body.id.trim();
    if (id === adminId) {
      return NextResponse.json(
        { error: "Du kannst dein eigenes Konto hier nicht löschen." },
        { status: 400 },
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/users", error);
    return NextResponse.json(
      { error: "Benutzer konnte nicht gelöscht werden." },
      { status: 500 },
    );
  }
}
