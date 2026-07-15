"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Registrierung fehlgeschlagen");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(
          isRegister
            ? "Konto erstellt, aber Anmeldung fehlgeschlagen."
            : "E-Mail oder Passwort ungültig.",
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isRegister ? "Konto erstellen" : "Anmelden"}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {isRegister
          ? "Starte dein persönliches TCG-Portfolio."
          : "Willkommen zurück bei CardPortfolio."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {isRegister && (
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Dein Name"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            E-Mail oder Benutzername
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="admin"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Passwort
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Mindestens 8 Zeichen"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-[var(--negative)] bg-[var(--negative-soft)] px-3 py-2 text-sm text-[var(--negative)]">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Bitte warten…"
            : isRegister
              ? "Registrieren"
              : "Anmelden"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        {isRegister ? (
          <>
            Bereits ein Konto?{" "}
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Anmelden
            </Link>
          </>
        ) : (
          <>
            Noch kein Konto?{" "}
            <Link
              href="/register"
              className="text-[var(--accent)] hover:underline"
            >
              Registrieren
            </Link>
          </>
        )}
      </p>

      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        <Link href="/dashboard" className="hover:text-[var(--foreground)]">
          ← Demo ohne Anmeldung ansehen
        </Link>
      </p>
    </div>
  );
}