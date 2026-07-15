"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/ui/card-image";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { useWishlist } from "@/components/wishlist-provider";
import { Price, formatMarketPrice } from "@/components/ui/price";

export function WishlistView() {
  const { items, count, totalValue, removeItem } = useWishlist();

  return (
    <>
      <PageHeader
        title="Wunschliste"
        subtitle={count === 0 ? "Keine Karten" : `${count} Karten`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="Karten auf Wunschliste" value={String(count)} />
        <MetricCard
          label="Geschätzter Wert"
          value={formatMarketPrice(totalValue)}
        />
        <MetricCard label="Preisalarme aktiv" value="0" />
      </div>

      <Panel title="Deine Wunschkarten">
        {count === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--muted)]">
              Deine Wunschliste ist noch leer.
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Füge Karten über die Kartendatenbank hinzu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
              >
                <CardImage
                  src={item.imageUrl}
                  fallbacks={item.imageFallbacks}
                  alt={item.name}
                  size="lg"
                  className="mb-3"
                />
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-[var(--muted)]">{item.setName}</p>
                <Price
                  value={item.price}
                  className="mt-2 text-sm font-medium"
                />
                <Button
                  variant="danger"
                  className="mt-3 w-full text-xs"
                  onClick={() => removeItem(item.id)}
                >
                  Entfernen
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}