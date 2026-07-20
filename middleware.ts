import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  COOKIE_NAME,
  isSiteGateEnabled,
  verifySiteGateToken,
} from "@/lib/site-gate";

const PUBLIC_PATHS = [
  "/zugang",
  "/api/site-gate",
  "/api/health",
  // Auth-Flows müssen ohne Site-Gate erreichbar sein (Reset-Links aus E-Mails)
  "/login",
  "/register",
  "/passwort-vergessen",
  "/passwort-zuruecksetzen",
  "/api/auth",
  "/api/debug/smtp",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest) {
  if (!isSiteGateEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const allowed = await verifySiteGateToken(token);

  if (allowed) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/zugang";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};