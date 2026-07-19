/**
 * Cost basis (EK) allocation when opening sealed products
 * (Booster, Display, ETB, etc.) into individual cards.
 */

export type AllocationMethod = "market" | "equal";

export type AllocatableItem = {
  id: string;
  name: string;
  /** Current market value per unit (0 allowed) */
  marketValue: number;
  quantity: number;
};

export type AllocationResult = {
  id: string;
  /** Allocated purchase cost for this line (all quantity) */
  costTotal: number;
  /** Cost per unit */
  costPerUnit: number;
  /** Share of sealed cost (0–1) */
  share: number;
};

export type BulkResidual = {
  name: string;
  costTotal: number;
  note: string;
};

/**
 * Distribute sealed product purchase cost across pulled cards.
 *
 * - market: card portion weighted by market value × quantity
 * - equal: card portion split evenly across line items
 *
 * Bulk residual always uses the estimated bulk market value as a continuous
 * weight vs. the sum of card market values (so changing the bulk € amount
 * immediately changes residual + card EK).
 */
export function allocateSealedCost(params: {
  sealedCost: number;
  method: AllocationMethod;
  items: AllocatableItem[];
  /** Optional estimated bulk market value when not all cards are listed */
  bulkMarketValue?: number;
  sealedProductName?: string;
}): {
  allocations: AllocationResult[];
  residual: BulkResidual | null;
} {
  const { sealedCost, method, items, bulkMarketValue = 0, sealedProductName } =
    params;

  const bulkMV = Math.max(0, Number.isFinite(bulkMarketValue) ? bulkMarketValue : 0);

  if (sealedCost <= 0) {
    return {
      allocations: items.map((i) => ({
        id: i.id,
        costTotal: 0,
        costPerUnit: 0,
        share: 0,
      })),
      residual: null,
    };
  }

  if (items.length === 0) {
    return {
      allocations: [],
      residual:
        sealedCost > 0
          ? {
              name: bulkName(sealedProductName),
              costTotal: round2(sealedCost),
              note: "Restposten aus geöffnetem Sealed",
            }
          : null,
    };
  }

  const cardMarketSum = items.reduce(
    (s, item) =>
      s + Math.max(0, item.marketValue) * Math.max(1, item.quantity),
    0,
  );

  // Residual share from bulk estimate vs. tracked card market values.
  // Changing bulkMV always changes residual (and thus card EK).
  let residualCost = 0;
  if (bulkMV > 0) {
    if (cardMarketSum > 0) {
      residualCost = round2(
        sealedCost * (bulkMV / (bulkMV + cardMarketSum)),
      );
    } else {
      // No market data on cards: treat bulk as one equal share + n card lines
      residualCost = round2(sealedCost / (items.length + 1));
    }
  }

  // Clamp residual
  if (residualCost > sealedCost) residualCost = sealedCost;
  if (residualCost < 0) residualCost = 0;

  const cardsPool = round2(sealedCost - residualCost);

  // Weights for splitting the cards pool
  let weights =
    method === "equal"
      ? items.map(() => 1)
      : items.map(
          (item) =>
            Math.max(0, item.marketValue) * Math.max(1, item.quantity),
        );
  let weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0) {
    weights = items.map(() => 1);
    weightSum = items.length;
  }

  const allocations: AllocationResult[] = items.map((item, i) => {
    const shareOfCards = weights[i] / weightSum;
    const costTotal = round2(cardsPool * shareOfCards);
    const qty = Math.max(1, item.quantity);
    return {
      id: item.id,
      costTotal,
      costPerUnit: round2(costTotal / qty),
      share: sealedCost > 0 ? costTotal / sealedCost : 0,
    };
  });

  // Absorb rounding drift into the largest card line (or last)
  const cardSum = allocations.reduce((s, a) => s + a.costTotal, 0);
  const drift = round2(cardsPool - cardSum);
  if (Math.abs(drift) >= 0.01 && allocations.length > 0) {
    let target = allocations[allocations.length - 1];
    for (const a of allocations) {
      if (a.costTotal > target.costTotal) target = a;
    }
    target.costTotal = round2(target.costTotal + drift);
    const item = items.find((i) => i.id === target.id)!;
    target.costPerUnit = round2(
      target.costTotal / Math.max(1, item.quantity),
    );
    target.share = sealedCost > 0 ? target.costTotal / sealedCost : 0;
  }

  // Final residual after drift fix
  const finalCardSum = allocations.reduce((s, a) => s + a.costTotal, 0);
  residualCost = round2(sealedCost - finalCardSum);

  return {
    allocations,
    residual:
      residualCost > 0.005
        ? {
            name: bulkName(sealedProductName),
            costTotal: residualCost,
            note: "Restposten – nicht erfasste Karten aus geöffnetem Sealed",
          }
        : null,
  };
}

function bulkName(sealedProductName?: string) {
  return sealedProductName
    ? `Bulk aus ${sealedProductName}`
    : "Bulk aus Sealed";
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatOriginLine(params: {
  sealedProductName: string;
  openedAt: Date | string;
}): string {
  const d =
    typeof params.openedAt === "string"
      ? new Date(params.openedAt)
      : params.openedAt;
  const dateLabel = d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `Herkunft: Geöffnet aus ${params.sealedProductName} · ${dateLabel}`;
}
