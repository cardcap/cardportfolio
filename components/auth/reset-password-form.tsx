"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";

function ResetPasswordFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 8) {
      setError("Mindestens 8 Zeichen.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Zurücksetzen fehlgeschlagen",
        );
      }
      router.push("/login?reset=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        Neues Passwort
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Vergib ein neues Passwort für dein CardCap-Konto.
      </p>

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
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        {!params.get("token") && (
          <div>
            <label htmlFor="token" className="mb-1.5 block text-sm font-medium">
              Token aus der E-Mail
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
          >
            Neues Passwort
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className="mb-1.5 block text-sm font-medium"
          >
            Passwort bestätigen
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-[var(--negative)] bg-[var(--negative-soft)] px-3 py-2 text-sm text-[var(--negative)]">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Speichern…" : "Passwort speichern"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="hover:text-[var(--foreground)]">
          ← Zur Anmeldung
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--muted)]">Formular wird geladen…</p>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}
