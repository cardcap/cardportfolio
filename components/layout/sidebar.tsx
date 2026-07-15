"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { Logo } from "@/components/logo";
import { NavIcon } from "@/components/layout/nav-icon";
import { mainNav } from "@/lib/nav-config";

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, isDemo, user } = useAuthMode();

  return (
    <aside className="hidden h-full w-[220px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-4 transition-opacity hover:opacity-80"
      >
        <Logo className="h-8 w-8" />
        <span className="text-sm font-semibold tracking-tight">
          Card<span className="text-[var(--accent)]">portfolio</span>
        </span>
      </Link>

      {isDemo && (
        <div className="mx-3 mt-3 rounded-lg border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
            Demo
          </p>
          <p className="text-[11px] text-[var(--muted)]">Beispieldaten aktiv</p>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {mainNav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
              }`}
            >
              <NavIcon type={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-[var(--border)] px-3 py-4">
        {isAuthenticated ? (
          <>
            <div className="mb-2 px-3 py-1">
              <p className="truncate text-xs font-medium">
                {user?.name ?? "Nutzer"}
              </p>
              <p className="truncate text-[10px] text-[var(--muted)]">
                {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/dashboard" })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
            >
              <NavIcon type="logout" />
              Ausloggen
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
            >
              <NavIcon type="login" />
              Anmelden
            </Link>
            <Link
              href="/register"
              className="flex w-full items-center gap-3 rounded-lg bg-[var(--accent-soft)] px-3 py-2.5 text-sm font-medium text-[var(--accent)] transition-colors hover:brightness-95"
            >
              Registrieren
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}