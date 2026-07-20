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
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure && port === 587,
  });
}

/** Simple CardCap-branded HTML shell (email-safe inline styles) */
function emailLayout(params: {
  title: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  const base = appUrl();
  const preheader = params.preheader ?? "";
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e8e8ed;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0c0c0e;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#141418;border:1px solid #2a2a32;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:1px solid #2a2a32;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;width:32px;height:32px;border-radius:10px;background:rgba(236,72,153,0.15);border:1px solid rgba(244,114,182,0.35);text-align:center;line-height:32px;font-size:14px;color:#f472b6;font-weight:700;vertical-align:middle;">C</span>
                    <span style="margin-left:10px;font-size:18px;font-weight:650;letter-spacing:-0.02em;color:#f4f4f5;vertical-align:middle;">Card<span style="color:#f472b6;">Cap</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #2a2a32;font-size:12px;line-height:1.5;color:#8b8b96;">
              CardCap — Deine Sammlung. Dein Wert. Alles im Blick.<br/>
              <a href="${base}" style="color:#f472b6;text-decoration:none;">${base.replace(/^https?:\/\//, "")}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin:8px 0 4px;padding:12px 22px;background:#ec4899;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn(
      "sendMail skipped: SMTP not configured",
      params.subject,
      params.to,
    );
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
      error:
        error instanceof Error ? error.message : "Mail-Versand fehlgeschlagen",
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
  const loginUrl = `${base}/login`;
  const forgotUrl = `${base}/passwort-vergessen`;

  const text = [
    `Hallo ${name},`,
    "",
    "dein Konto bei CardCap wurde erfolgreich erstellt.",
    "",
    `E-Mail / Login: ${params.to}`,
    `Anmelden: ${loginUrl}`,
    "",
    "Aus Sicherheitsgründen speichern wir dein Passwort nur verschlüsselt",
    "und senden es nicht per E-Mail. Falls du es vergessen hast:",
    forgotUrl,
    "",
    "Viel Erfolg mit deiner Sammlung!",
    "Dein CardCap-Team",
    "",
    `— ${base}`,
  ].join("\n");

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:650;color:#f4f4f5;letter-spacing:-0.02em;">Willkommen, ${escapeHtml(name)} 👋</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#c4c4cc;">
      dein Konto bei CardCap wurde erfolgreich erstellt. Verwalte Karten, Sealed und dein Portfolio an einem Ort.
    </p>
    <table role="presentation" width="100%" style="margin:0 0 20px;background:#0c0c0e;border:1px solid #2a2a32;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-size:13px;color:#8b8b96;">
          Login-E-Mail<br/>
          <strong style="color:#f4f4f5;font-size:15px;">${escapeHtml(params.to)}</strong>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;">${buttonHtml(loginUrl, "Jetzt anmelden")}</p>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#8b8b96;">
      Passwort senden wir aus Sicherheitsgründen nicht per E-Mail.
      Vergessen? <a href="${forgotUrl}" style="color:#f472b6;text-decoration:none;">Passwort zurücksetzen</a>
    </p>
  `;

  return sendMail({
    to: params.to,
    subject,
    text,
    html: emailLayout({
      title: subject,
      preheader: "Dein CardCap-Konto ist bereit.",
      bodyHtml,
    }),
  });
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

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:650;color:#f4f4f5;">Passwort zurücksetzen</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#c4c4cc;">
      Hallo ${escapeHtml(name)}, du hast das Zurücksetzen deines Passworts angefordert.
      Der Link ist etwa <strong style="color:#f4f4f5;">1 Stunde</strong> gültig.
    </p>
    <p style="margin:0 0 8px;">${buttonHtml(link, "Neues Passwort festlegen")}</p>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8b8b96;word-break:break-all;">
      Funktioniert der Button nicht? Kopiere diesen Link:<br/>
      <a href="${link}" style="color:#f472b6;">${escapeHtml(link)}</a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#8b8b96;">
      Wenn du das nicht warst, ignoriere diese E-Mail einfach.
    </p>
  `;

  return sendMail({
    to: params.to,
    subject,
    text,
    html: emailLayout({
      title: subject,
      preheader: "Link zum Zurücksetzen deines Passworts",
      bodyHtml,
    }),
  });
}

export async function sendPasswordChangedEmail(params: {
  to: string;
  name?: string | null;
}) {
  const base = appUrl();
  const name = params.name?.trim() || "dort";
  const subject = "CardCap: Passwort wurde geändert";
  const loginUrl = `${base}/login`;
  const forgotUrl = `${base}/passwort-vergessen`;

  const text = [
    `Hallo ${name},`,
    "",
    "das Passwort deines CardCap-Kontos wurde soeben geändert.",
    `Anmelden: ${loginUrl}`,
    "",
    "Falls du das nicht warst, setze dein Passwort sofort zurück:",
    forgotUrl,
    "",
    "Dein CardCap-Team",
  ].join("\n");

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:650;color:#f4f4f5;">Passwort geändert</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#c4c4cc;">
      Hallo ${escapeHtml(name)}, das Passwort deines CardCap-Kontos wurde soeben geändert.
    </p>
    <p style="margin:0 0 8px;">${buttonHtml(loginUrl, "Zur Anmeldung")}</p>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#8b8b96;">
      Falls du das <strong style="color:#f4f4f5;">nicht</strong> warst:
      <a href="${forgotUrl}" style="color:#f472b6;text-decoration:none;">Passwort sofort zurücksetzen</a>
    </p>
  `;

  return sendMail({
    to: params.to,
    subject,
    text,
    html: emailLayout({
      title: subject,
      preheader: "Dein CardCap-Passwort wurde geändert",
      bodyHtml,
    }),
  });
}
