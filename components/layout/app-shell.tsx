import { DemoBanner } from "@/components/auth/demo-banner";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MarketPriceDisclaimer } from "@/components/ui/price";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh min-h-0 bg-[var(--background)]">
      <Sidebar />
      <MobileNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--background)]">
        {/*
          Single scroll container: content uses full width to the right edge.
          Thin transparent scrollbar (globals.css) — no dark gutter strip.
        */}
        <main className="app-main flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-[var(--background)] px-4 sm:px-6 lg:px-6 xl:px-8">
          <DemoBanner />
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
            {children}
          </div>
          <MarketPriceDisclaimer className="shrink-0 pt-3" />
        </main>
      </div>
    </div>
  );
}