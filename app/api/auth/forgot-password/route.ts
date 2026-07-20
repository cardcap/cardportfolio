import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/**
 * Always returns a generic success message (no email enumeration).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Bitte eine gültige E-Mail angeben." },
        { status: 400 },
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "E-Mail-Versand ist noch nicht konfiguriert. Bitte den Admin kontaktieren.",
        },
        { status: 503 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.password) {
      const token = await createPasswordResetToken(email);
      await sendPasswordResetEmail({
        to: email,
        name: user.name,
        token,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.",
    });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json(
      { error: "Anfrage fehlgeschlagen." },
      { status: 500 },
    );
  }
}
