import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-Mail und Passwort sind erforderlich." },
        { status: 400 },
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Bitte eine gültige E-Mail-Adresse angeben." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Das Passwort muss mindestens 8 Zeichen lang sein." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits registriert." },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const displayName = name || email.split("@")[0];
    const user = await prisma.user.create({
      data: {
        name: displayName,
        email,
        password: hashed,
      },
    });

    // Welcome mail (never includes plaintext password)
    const mail = await sendWelcomeEmail({
      to: user.email!,
      name: user.name,
    });
    if (!mail.ok) {
      console.error("register: welcome mail failed", {
        email: user.email,
        skipped: mail.skipped,
        error: mail.error,
      });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      emailSent: mail.ok,
      emailSkipped: mail.skipped ?? false,
      // Surface non-sensitive failure reason (helps debugging SMTP)
      emailError: mail.ok ? undefined : mail.error,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen." },
      { status: 500 },
    );
  }
}
