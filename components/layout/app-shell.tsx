import { DemoBanner } from "@/components/auth/demo-banner";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh min-h-0 bg-[var(--background)]">
      <Sidebar />
      <MobileNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--background)]">
        <main className="app-main min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[var(--background)] px-4 sm:px-6 lg:px-6 xl:px-8">
          <DemoBanner />
          <div className="w-full min-w-0 pb-4">{children}</div>
        </main>
      </div>
    </div>
  );
}