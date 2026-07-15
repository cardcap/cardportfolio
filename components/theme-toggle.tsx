"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";

const APP_PREFIXES = [
  "/dashboard",
  "/sammlung",
  "/portfolio",
  "/sets",
  "/kartendatenbank",
  "/wunschliste",
];

function isAppRoute(pathname: string): boolean {
  return APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

type ThemeToggleButtonProps = {
  className?: string;
};

export function ThemeToggleButton({ className = "" }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      suppressHydrationWarning
      aria-label={
        mounted
          ? theme === "dark"
            ? "Zu hellem Modus wechseln"
            : "Zu dunklem Modus wechseln"
          : "Theme wechseln"
      }
      className={`group flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-[0_0_0_4px_var(--accent-soft)] ${className}`}
    >
      {!mounted ? (
        <span className="h-[18px] w-[18px] rounded-full bg-[var(--border-strong)]" />
      ) : theme === "dark" ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function ThemeToggle() {
  const pathname = usePathname();
  if (isAppRoute(pathname)) return null;

  return <ThemeToggleButton className="fixed top-5 right-5 z-50" />;
}