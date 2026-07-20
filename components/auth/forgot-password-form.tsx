"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Anfrage fehlgeschlagen",
        );
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Passwort vergessen
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Wir senden dir einen Link zum Zurücksetzen an deine E-Mail-Adresse.
      </p>

      {done ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-lg border border-[var(--positive)]/30 bg-[var(--positive-soft)] px-3 py-3 text-sm text-[var(--positive)]">
            Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link
            gesendet. Bitte Posteingang (und Spam) prüfen.
          </p>
          <Link
            href="/login"
            className="block text-center text-sm text-[var(--accent)] hover:underline"
          >
            Zur Anmeldung
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="info@beispiel.de"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-[var(--negative)] bg-[var(--negative-soft)] px-3 py-2 text-sm text-[var(--negative)]">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Senden…" : "Link senden"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="hover:text-[var(--foreground)]">
          ← Zurück zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
