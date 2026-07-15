"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SiteGateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/site-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Anmeldung fehlgeschlagen.");
      }

      router.push(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Zugang zur Seite</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Diese Seite ist privat. Bitte mit Zugangsdaten anmelden.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="gate-user" className="mb-1.5 block text-sm font-medium">
            Benutzername
          </label>
          <input
            id="gate-user"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="admin"
          />
        </div>

        <div>
          <label htmlFor="gate-password" className="mb-1.5 block text-sm font-medium">
            Passwort
          </label>
          <input
            id="gate-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-[var(--negative)] bg-[var(--negative-soft)] px-3 py-2 text-sm text-[var(--negative)]">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Bitte warten…" : "Zugang öffnen"}
        </Button>
      </form>
    </div>
  );
}