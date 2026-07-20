import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { consumePasswordResetToken } from "@/lib/auth-tokens";
import { sendPasswordChangedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "E-Mail, Token und neues Passwort sind erforderlich." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Das Passwort muss mindestens 8 Zeichen lang sein." },
        { status: 400 },
      );
    }

    const ok = await consumePasswordResetToken(email, token);
    if (!ok) {
      return NextResponse.json(
        { error: "Link ungültig oder abgelaufen. Bitte erneut anfordern." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Benutzer nicht gefunden." },
        { status: 404 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await sendPasswordChangedEmail({ to: email, name: user.name });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json(
      { error: "Passwort konnte nicht gesetzt werden." },
      { status: 500 },
    );
  }
}
