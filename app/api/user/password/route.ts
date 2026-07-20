import bcrypt from "bcryptjs";
import { requireSessionUserId } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId || userId === "site-gate-admin") {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Aktuelles und neues Passwort sind erforderlich." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Das neue Passwort muss mindestens 8 Zeichen haben." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) {
      return NextResponse.json(
        { error: "Passwort-Änderung für dieses Konto nicht möglich." },
        { status: 400 },
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Aktuelles Passwort ist falsch." },
        { status: 403 },
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/user/password", error);
    return NextResponse.json(
      { error: "Passwort konnte nicht geändert werden." },
      { status: 500 },
    );
  }
}
