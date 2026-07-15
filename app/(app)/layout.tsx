import { AppShell } from "@/components/layout/app-shell";
import { WishlistProvider } from "@/components/wishlist-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WishlistProvider>
      <AppShell>{children}</AppShell>
    </WishlistProvider>
  );
}