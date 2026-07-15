"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { BrandMark } from "@/components/landing/icons";
import { NavIcon } from "@/components/layout/nav-icon";
import { ThemeToggleButton } from "@/components/theme-toggle";
import {
  flattenNav,
  mainNav,
  mobileBottomNav,
  type NavEntry,
  type NavGroup,
} from "@/lib/nav-config";

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

export function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated, isDemo, user } = useAuthMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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

  const bottomHrefs = new Set(mobileBottomNav.map((i) => i.href));
  const moreActive = flattenNav().some(
    (item) => !bottomHrefs.has(item.href) && isActive(pathname, item.href),
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:hidden">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2"
          onClick={() => setMenuOpen(false)}
        >
          <BrandMark className="h-7 w-7 shrink-0" />
          <span className="truncate text-sm font-semibold tracking-tight">
            Card<span className="text-[var(--accent)]">Cap</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggleButton className="relative top-0 right-0" />
          <button
            type="button"
            aria-label="Menü öffnen"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          >
            <NavIcon type="menu" />
          </button>
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          aria-label="Menü schließen"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(100vw-3rem,320px)] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-xl transition-transform duration-200 lg:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {isDemo && (
          <div className="mx-4 mt-4 rounded-lg border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
              Demo
            </p>
            <p className="text-[11px] text-[var(--muted)]">Beispieldaten aktiv</p>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {mainNav.map((entry) => (
            <MobileNavEntry
              key={entry.type === "group" ? entry.label : entry.href}
              entry={entry}
              pathname={pathname}
              open={entry.type === "group" ? !!openGroups[entry.label] : false}
              onToggle={() => {
                if (entry.type === "group") {
                  setOpenGroups((prev) => ({
                    ...prev,
                    [entry.label]: !prev[entry.label],
                  }));
                }
              }}
            />
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-[var(--border)] px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
              >
                <NavIcon type="logout" />
                Ausloggen
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)]"
              >
                <NavIcon type="login" />
                Anmelden
              </Link>
              <Link
                href="/register"
                className="flex w-full items-center gap-3 rounded-lg bg-[var(--accent-soft)] px-3 py-3 text-sm font-medium text-[var(--accent)]"
              >
                Registrieren
              </Link>
            </>
          )}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-5">
          {mobileBottomNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive(pathname, item.href)
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)]"
              }`}
            >
              <NavIcon type={item.icon} className="h-5 w-5" />
              <span className="truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors ${
              moreActive ? "text-[var(--accent)]" : "text-[var(--muted)]"
            }`}
          >
            <NavIcon type="menu" className="h-5 w-5" />
            <span>Mehr</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function MobileNavEntry({
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
      <div>
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
            groupActive
              ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          }`}
        >
          <NavIcon type={entry.icon} />
          <span className="flex-1 text-left">{entry.label}</span>
          <span className={open ? "rotate-90" : ""}>
            <NavIcon type="chevron" className="h-3.5 w-3.5" />
          </span>
        </button>
        {open &&
          entry.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={`ml-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive(pathname, child.href)
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
              }`}
            >
              <NavIcon type={child.icon} className="h-4 w-4" />
              {child.label}
            </Link>
          ))}
      </div>
    );
  }

  return (
    <Link
      href={entry.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
        isActive(pathname, entry.href)
          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
      }`}
    >
      <NavIcon type={entry.icon} />
      {entry.label}
    </Link>
  );
}
