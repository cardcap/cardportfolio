"use client";

import Link from "next/link";
import { PortfolioTransactions } from "@/components/portfolio/portfolio-transactions";

/** Standalone Portfolio → Transaktionen page (sidebar sibling of Übersicht). */
export function PortfolioTransactionsView() {
  return (
    <div className="pb-4">
      <div className="mb-5">
        <p className="text-xs text-[var(--muted)]">
          <Link href="/portfolio" className="hover:text-[var(--foreground)]">
            Portfolio
          </Link>
          <span className="mx-1.5 opacity-50">/</span>
          <span className="text-[var(--foreground)]">Transaktionen</span>
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
          Transaktionen
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Käufe und Verkäufe aus deinen Assets → Karten &amp; Sealed
        </p>
      </div>
      <PortfolioTransactions />
    </div>
  );
}
