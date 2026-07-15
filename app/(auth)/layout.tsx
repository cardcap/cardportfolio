import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <header className="border-b border-[var(--border)] px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Logo className="h-8 w-8" />
          <span className="text-sm font-semibold tracking-tight">
            Card<span className="text-[var(--accent)]">portfolio</span>
          </span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        {children}
      </main>
    </div>
  );
}