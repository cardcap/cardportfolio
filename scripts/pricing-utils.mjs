/**
 * Preisdaten aus TCGdex-Kartendetails extrahieren.
 * Quelle: https://tcgdex.dev/markets-prices (Cardmarket + TCGplayer)
 */
export function extractPricing(detail) {
  const cm =
    detail.pricing?.cardmarket ??
    detail.variants_detailed?.[0]?.pricing?.cardmarket;

  if (cm) {
    return {
      trend: cm.trend ?? cm["trend-holo"] ?? undefined,
      avg: cm.avg ?? cm["avg-holo"] ?? undefined,
      low: cm.low ?? cm["low-holo"] ?? undefined,
      avg7: cm.avg7 ?? cm["avg7-holo"] ?? undefined,
      avg30: cm.avg30 ?? cm["avg30-holo"] ?? undefined,
      updatedAt: cm.updated ?? detail.pricing?.cardmarket?.updated,
      unit: cm.unit ?? "EUR",
      source: "cardmarket",
    };
  }

  const tp = detail.pricing?.tcgplayer;
  if (tp && typeof tp === "object") {
    const variant =
      tp.normal ??
      tp.reverse ??
      tp.holofoil ??
      tp["reverse-holofoil"] ??
      Object.values(tp).find(
        (v) => v && typeof v === "object" && "marketPrice" in v,
      );

    if (variant?.marketPrice != null) {
      return {
        trend: variant.marketPrice,
        avg: variant.midPrice,
        low: variant.lowPrice,
        updatedAt: tp.updated,
        unit: tp.unit ?? "USD",
        source: "tcgplayer",
      };
    }
  }

  return null;
}