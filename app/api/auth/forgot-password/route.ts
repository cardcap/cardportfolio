import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

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
      const mail = await sendPasswordResetEmail({
        to: email,
        name: user.name,
        token,
      });
      if (!mail.ok) {
        console.error("forgot-password: mail failed", {
          email,
          skipped: mail.skipped,
          error: mail.error,
        });
        // Do not leak existence; still tell client that delivery failed
        // when SMTP is broken so admins/users aren't left guessing.
        return NextResponse.json(
          {
            ok: false,
            error:
              "E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen oder den Admin kontaktieren.",
            emailError: mail.error,
          },
          { status: 502 },
        );
      }
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
