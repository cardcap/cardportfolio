const COOKIE_NAME = "site-gate-token";
const TOKEN_VERSION = "v1";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export { COOKIE_NAME, TOKEN_MAX_AGE_SECONDS };

export function isSiteGateEnabled(): boolean {
  return Boolean(process.env.SITE_GATE_PASSWORD?.trim());
}

export function getSiteGateCredentials() {
  return {
    user: process.env.SITE_GATE_USER?.trim() || "admin",
    password: process.env.SITE_GATE_PASSWORD?.trim() || "",
  };
}

function getSigningSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret || null;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signMessage(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createSiteGateToken(): Promise<string | null> {
  const secret = getSigningSecret();
  if (!secret) return null;

  const exp = Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE_SECONDS;
  const payload = `${TOKEN_VERSION}.${exp}`;
  const signature = await signMessage(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifySiteGateToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = getSigningSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;

  const exp = Number.parseInt(parts[1] ?? "", 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expected = await signMessage(payload, secret);
  return timingSafeEqual(parts[2] ?? "", expected);
}

export function verifySiteGateLogin(username: string, password: string): boolean {
  const { user, password: expected } = getSiteGateCredentials();
  if (!expected) return false;

  const userOk = timingSafeEqual(username.trim(), user);
  const passOk = timingSafeEqual(password, expected);
  return userOk && passOk;
}