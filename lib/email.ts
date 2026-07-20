import "server-only";

import nodemailer from "nodemailer";

function appUrl(): string {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://cardcap.de"
  );
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    `CardCap <${process.env.SMTP_USER?.trim() || "info@cardcap.de"}>`
  );
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    throw new Error("SMTP ist nicht konfiguriert (SMTP_HOST/USER/PASS).");
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure && port === 587,
  });
}

export async function sendMail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn("sendMail skipped: SMTP not configured", params.subject, params.to);
    return { ok: false, skipped: true, error: "SMTP nicht konfiguriert" };
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: fromAddress(),
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text.replace(/\n/g, "<br/>"),
    });
    return { ok: true };
  } catch (error) {
    console.error("sendMail error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Mail-Versand fehlgeschlagen",
    };
  }
}

/** Willkommen nach Registrierung — nie das Klartext-Passwort senden */
export async function sendWelcomeEmail(params: {
  to: string;
  name?: string | null;
}) {
  const base = appUrl();
  const name = params.name?.trim() || "bei CardCap";
  const subject = "Willkommen bei CardCap";
  const text = [
    `Hallo ${name},`,
    "",
    "dein Konto bei CardCap wurde erfolgreich erstellt.",
    "",
    `E-Mail / Login: ${params.to}`,
    `Anmelden: ${base}/login`,
    "",
    "Aus Sicherheitsgründen speichern wir dein Passwort nur verschlüsselt",
    "und senden es nicht per E-Mail. Falls du es vergessen hast:",
    `${base}/passwort-vergessen`,
    "",
    "Viel Erfolg mit deiner Sammlung!",
    "Dein CardCap-Team",
    "",
    `— ${base}`,
  ].join("\n");

  return sendMail({ to: params.to, subject, text });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string | null;
  token: string;
}) {
  const base = appUrl();
  const link = `${base}/passwort-zuruecksetzen?token=${encodeURIComponent(params.token)}&email=${encodeURIComponent(params.to)}`;
  const name = params.name?.trim() || "dort";
  const subject = "CardCap: Passwort zurücksetzen";
  const text = [
    `Hallo ${name},`,
    "",
    "du hast das Zurücksetzen deines Passworts angefordert.",
    "Öffne diesen Link (gültig ca. 1 Stunde):",
    "",
    link,
    "",
    "Wenn du das nicht warst, ignoriere diese E-Mail.",
    "",
    "Dein CardCap-Team",
  ].join("\n");

  return sendMail({ to: params.to, subject, text });
}

export async function sendPasswordChangedEmail(params: {
  to: string;
  name?: string | null;
}) {
  const base = appUrl();
  const name = params.name?.trim() || "dort";
  const subject = "CardCap: Passwort wurde geändert";
  const text = [
    `Hallo ${name},`,
    "",
    "das Passwort deines CardCap-Kontos wurde soeben geändert.",
    `Anmelden: ${base}/login`,
    "",
    "Falls du das nicht warst, setze dein Passwort sofort zurück:",
    `${base}/passwort-vergessen`,
    "",
    "Dein CardCap-Team",
  ].join("\n");

  return sendMail({ to: params.to, subject, text });
}
