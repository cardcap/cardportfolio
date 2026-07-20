"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { isAdminRole } from "@/lib/user-roles";

const links = [
  { href: "/admin", label: "Übersicht", exact: true },
  { href: "/admin/benutzer", label: "Benutzer" },
  { href: "/admin/system", label: "System" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthMode();
  const isAdmin = isAuthenticated && isAdminRole(user?.role);

  if (isLoading) {
    return (
      <div className="pb-8">
        <p className="text-sm text-[var(--muted)]">Laden…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="pb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]">
          Keine Admin-Berechtigung.{" "}
          <Link href="/einstellungen" className="text-[var(--accent)] hover:underline">
            Zu den Einstellungen
          </Link>
          {" · "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">
            <Link href="/dashboard" className="hover:text-[var(--foreground)]">
              App
            </Link>
            <span className="mx-1.5 opacity-50">/</span>
            <span className="text-[var(--foreground)]">Admin</span>
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            Admin-Panel
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Benutzer, System und Überblick
          </p>
        </div>
      </div>

      <nav className="mb-5 flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        {links.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
