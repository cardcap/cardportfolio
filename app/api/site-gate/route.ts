import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  TOKEN_MAX_AGE_SECONDS,
  createSiteGateToken,
  isSiteGateEnabled,
  verifySiteGateLogin,
} from "@/lib/site-gate";

export async function POST(request: Request) {
  if (!isSiteGateEnabled()) {
    return NextResponse.json({ error: "Zugangsschutz ist deaktiviert." }, { status: 404 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!verifySiteGateLogin(username, password)) {
    return NextResponse.json({ error: "Benutzername oder Passwort ungültig." }, { status: 401 });
  }

  const token = await createSiteGateToken();
  if (!token) {
    return NextResponse.json(
      { error: "Server-Konfiguration unvollständig (AUTH_SECRET)." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}