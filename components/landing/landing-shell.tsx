import Link from "next/link";
import { Logo } from "@/components/logo";
import { BRAND_NAME, landingNav } from "@/lib/landing-nav";

type LandingShellProps = {
  children: React.ReactNode;
};

export function LandingShell({ children }: LandingShellProps) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-[var(--accent-glow)] blur-3xl" />
        <div className="absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-[var(--accent-soft)] blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Logo className="h-8 w-8" />
            <span className="text-sm font-semibold tracking-tight">
              Card<span className="text-[var(--accent)]">portfolio</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {landingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
            <Link
              href="/login"
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-full bg-[var(--accent)] px-3 text-sm font-medium text-white transition-all hover:brightness-110 sm:px-4"
            >
              <span className="hidden sm:inline">Kostenlos starten</span>
              <span className="sm:hidden">Start</span>
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10">{children}</div>

      <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--surface)]/60">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{BRAND_NAME}</p>
              <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">
                Dein persönliches TCG Portfolio — Sammlung, Werte und Sets im
                Überblick.
              </p>
            </div>
            <nav className="flex flex-col gap-2 sm:items-end">
              {landingNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                Demo ansehen
              </Link>
            </nav>
          </div>
          <p className="mt-8 text-xs text-[var(--muted)]">
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}