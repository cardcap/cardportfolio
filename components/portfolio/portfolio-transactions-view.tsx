"use client";

import Link from "next/link";
import { useState } from "react";
import { PortfolioTransactions } from "@/components/portfolio/portfolio-transactions";

/** Standalone Portfolio → Transaktionen page (sidebar sibling of Übersicht). */
export function PortfolioTransactionsView() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="pb-4">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pt-1">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white hover:brightness-110"
          >
            <span className="text-base leading-none">+</span>
            Transaktion erfassen
          </button>
        </div>
      </div>
      <PortfolioTransactions
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
      />
    </div>
  );
}
