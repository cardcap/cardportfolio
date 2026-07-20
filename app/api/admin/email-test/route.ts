import { NextRequest, NextResponse } from "next/server";
import { requireAdminUserId } from "@/lib/api-auth";
import {
  getEmailConfigStatus,
  sendMail,
  verifySmtp,
} from "@/lib/email";

export const dynamic = "force-dynamic";
/** SMTP can be slow; allow headroom where the plan permits */
export const maxDuration = 30;

/**
 * GET  — SMTP verify (handshake only)
 * POST — verify + optional test mail { to?: string }
 */
export async function GET() {
  const adminId = await requireAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await verifySmtp();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let to: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.to === "string") {
      to = body.to.trim().toLowerCase();
    }
  } catch {
    /* empty body ok */
  }

  const verify = await verifySmtp();
  if (!verify.ok) {
    return NextResponse.json(
      {
        ok: false,
        step: "verify",
        error: verify.error,
        config: verify.config,
      },
      { status: 502 },
    );
  }

  if (!to) {
    return NextResponse.json({
      ok: true,
      step: "verify",
      message: "SMTP-Verbindung OK. Mit { to: \"…\" } Testmail senden.",
      config: getEmailConfigStatus(),
    });
  }

  if (!to.includes("@")) {
    return NextResponse.json(
      { error: "Bitte eine gültige E-Mail angeben." },
      { status: 400 },
    );
  }

  const mail = await sendMail({
    to,
    subject: "CardCap: SMTP-Test",
    text: [
      "Das ist eine Testmail von CardCap.",
      "Wenn du das liest, funktioniert IONOS SMTP über Vercel.",
      "",
      `Zeit: ${new Date().toISOString()}`,
    ].join("\n"),
  });

  return NextResponse.json(
    {
      ok: mail.ok,
      step: "send",
      error: mail.error,
      skipped: mail.skipped,
      to,
      config: getEmailConfigStatus(),
    },
    { status: mail.ok ? 200 : 502 },
  );
}
