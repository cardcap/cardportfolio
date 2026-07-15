"use client";

import Link from "next/link";
import { useAuthMode } from "@/components/auth/use-auth-mode";

export function DemoBanner() {
  const { isDemo } = useAuthMode();

  if (!isDemo) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3">
      <div>
        <p className="text-sm font-medium">Demo-Modus</p>
        <p className="text-xs text-[var(--muted)]">
          Du siehst Beispieldaten. Kartendatenbank & lokale Wunschliste sind
          nutzbar — Sammlung & Portfolio speichern nur mit Konto.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          href="/login"
          className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium transition-colors hover:border-[var(--border-strong)]"
        >
          Anmelden
        </Link>
        <Link
          href="/register"
          className="inline-flex h-8 items-center rounded-lg bg-[var(--accent)] px-3 text-xs font-medium text-white transition-all hover:brightness-110"
        >
          Registrieren
        </Link>
      </div>
    </div>
  );
}