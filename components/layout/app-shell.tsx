import { DemoBanner } from "@/components/auth/demo-banner";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { MarketPriceDisclaimer } from "@/components/ui/price";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh min-h-0 bg-[var(--background)]">
      <Sidebar />
      <MobileNav />
      {/* Desktop: theme toggle always top-right of the content area */}
      <div className="pointer-events-none fixed right-5 top-5 z-40 hidden lg:block lg:right-7">
        <div className="pointer-events-auto">
          <ThemeToggleButton className="!h-9 !w-9 shadow-sm" />
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="app-main flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 sm:px-6 lg:overflow-hidden lg:px-8">
          <DemoBanner />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            {children}
          </div>
          <MarketPriceDisclaimer className="shrink-0 pt-3" />
        </main>
      </div>
    </div>
  );
}