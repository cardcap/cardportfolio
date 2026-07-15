import { Suspense } from "react";
import { PortfolioView } from "@/components/portfolio/portfolio-view";

export default function PortfolioPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--muted)]">Portfolio wird geladen…</p>
      }
    >
      <PortfolioView />
    </Suspense>
  );
}
