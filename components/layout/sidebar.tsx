"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { BrandMark } from "@/components/landing/icons";
import { NavIcon } from "@/components/layout/nav-icon";
import { mainNav, type NavEntry, type NavGroup } from "@/lib/nav-config";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  return (
    pathname === group.matchPrefix ||
    pathname.startsWith(`${group.matchPrefix}/`) ||
    group.children.some((c) => isActive(pathname, c.href))
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, isDemo, user } = useAuthMode();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const entry of mainNav) {
        if (entry.type === "group" && isGroupActive(pathname, entry)) {
          next[entry.label] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside className="hidden h-full w-[220px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-4 transition-opacity hover:opacity-80"
      >
        <BrandMark className="h-8 w-8" />
        <span className="text-sm font-semibold tracking-tight">
          Card<span className="text-[var(--accent)]">Cap</span>
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
        {mainNav.map((entry) => (
          <NavEntryItem
            key={entry.type === "group" ? entry.label : entry.href}
            entry={entry}
            pathname={pathname}
            open={entry.type === "group" ? !!openGroups[entry.label] : false}
            onToggle={() =>
              entry.type === "group" && toggleGroup(entry.label)
            }
          />
        ))}
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

function NavEntryItem({
  entry,
  pathname,
  open,
  onToggle,
}: {
  entry: NavEntry;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (entry.type === "group") {
    const groupActive = isGroupActive(pathname, entry);
    return (
      <div className="mb-0.5">
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            groupActive
              ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          }`}
          aria-expanded={open}
        >
          <NavIcon type={entry.icon} />
          <span className="flex-1 text-left">{entry.label}</span>
          <span
            className={`text-[var(--muted)] transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            <NavIcon type="chevron" className="h-3.5 w-3.5" />
          </span>
        </button>
        {open && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[var(--border)] pl-2">
            {entry.children.map((child) => {
              const active = isActive(pathname, child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <NavIcon type={child.icon} className="h-4 w-4" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const active = isActive(pathname, entry.href);
  return (
    <Link
      href={entry.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
      }`}
    >
      <NavIcon type={entry.icon} />
      {entry.label}
    </Link>
  );
}
