import Link from "next/link";
import { CardCapLogo, CardCapMark } from "@/components/brand/cardcap-logo";
import { BRAND_NAME, landingNav } from "@/lib/landing-nav";

type LandingShellProps = {
  children: React.ReactNode;
};

export function LandingShell({ children }: LandingShellProps) {
  return (
    <div className="landing-page relative min-h-dvh overflow-x-hidden bg-[#050508] text-zinc-100">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute -left-40 top-40 h-80 w-80 rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute -right-20 top-60 h-96 w-96 rounded-full bg-pink-400/8 blur-[110px]" />
      </div>

      <header className="relative z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center transition-opacity hover:opacity-80"
            aria-label="CardCap"
          >
            <CardCapLogo className="h-8 w-auto max-w-[168px] text-zinc-100" />
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            {landingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hidden px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100 sm:inline"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="ml-1 inline-flex h-9 items-center rounded-full bg-pink-400 px-4 text-sm font-medium text-zinc-950 transition-all hover:bg-pink-300 hover:shadow-[0_0_0_4px_rgba(244,114,182,0.2)]"
            >
              Kostenlos starten
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10">{children}</div>

      <footer className="relative z-10 border-t border-white/8 bg-black/40">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardCapMark className="h-7 w-7 text-zinc-100" />
                <p className="text-sm font-semibold">{BRAND_NAME}</p>
              </div>
              <p className="mt-2 max-w-xs text-sm text-zinc-500">
                Dein TCG-Portfolio — Sammlung, Werte und Sets an einem Ort.
              </p>
            </div>
            <nav className="flex flex-col gap-2 sm:items-end">
              {landingNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
              >
                Demo ansehen
              </Link>
            </nav>
          </div>
          <p className="mt-8 text-xs text-zinc-600">
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}
