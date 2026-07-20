import Link from "next/link";
import { CardCapLogo } from "@/components/brand/cardcap-logo";

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
          className="inline-flex items-center transition-opacity hover:opacity-80"
          aria-label="CardCap"
        >
          <CardCapLogo className="h-8 w-auto max-w-[160px] text-[var(--foreground)]" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        {children}
      </main>
    </div>
  );
}