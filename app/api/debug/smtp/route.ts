import { NextRequest, NextResponse } from "next/server";
import {
  getEmailConfigStatus,
  sendMail,
  verifySmtp,
} from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Temporary SMTP probe for production debugging.
 * Auth: Authorization: Bearer <AUTH_SECRET>  OR  x-site-gate-password: <SITE_GATE_PASSWORD>
 * Remove or lock down once mail works.
 */
function authorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const gate =
    request.headers.get("x-site-gate-password")?.trim() ||
    request.headers.get("x-debug-secret")?.trim() ||
    "";
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  const sitePass = process.env.SITE_GATE_PASSWORD?.trim() ?? "";
  if (bearer && secret && bearer === secret) return true;
  if (gate && sitePass && gate === sitePass) return true;
  if (gate && secret && gate === secret) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await verifySmtp();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const to = typeof body?.to === "string" ? body.to.trim().toLowerCase() : "";

  const verify = await verifySmtp();
  if (!verify.ok) {
    return NextResponse.json(
      { ok: false, step: "verify", error: verify.error, config: verify.config },
      { status: 502 },
    );
  }

  if (!to) {
    return NextResponse.json({
      ok: true,
      step: "verify",
      message: "SMTP OK. POST { to } für Testmail.",
      config: getEmailConfigStatus(),
    });
  }

  const mail = await sendMail({
    to,
    subject: "CardCap: SMTP-Test",
    text: `SMTP-Test von CardCap\n${new Date().toISOString()}`,
  });

  return NextResponse.json(
    {
      ok: mail.ok,
      step: "send",
      error: mail.error,
      to,
      config: getEmailConfigStatus(),
    },
    { status: mail.ok ? 200 : 502 },
  );
}
