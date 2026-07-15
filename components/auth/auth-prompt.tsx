"use client";

import Link from "next/link";
type AuthPromptProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
};

export function AuthPrompt({
  open,
  onClose,
  title = "Konto erforderlich",
  description = "Diese Funktion ist nur mit einem Konto verfügbar. Im Demo-Modus kannst du die App ansehen und die Kartendatenbank nutzen.",
}: AuthPromptProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
      >
        <h2 id="auth-prompt-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white transition-all hover:brightness-110"
          >
            Kostenlos registrieren
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium transition-colors hover:bg-[var(--surface-elevated)]"
          >
            Anmelden
          </Link>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-[var(--muted)] transition-opacity hover:opacity-70"
        >
          Demo fortsetzen
        </button>
      </div>
    </div>
  );
}