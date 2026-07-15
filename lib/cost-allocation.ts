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
 * - market: weighted by market value × quantity (recommended)
 * - equal: split evenly across line items (not by quantity of commons)
 *
 * If only hits are recorded, pass `bulkMarketValue` (or force residual)
 * so the remaining sealed cost becomes a "Bulk aus …" residual lot.
 * Otherwise hits would absorb 100% of the display price unrealistically.
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

  if (sealedCost <= 0 || items.length === 0) {
    return {
      allocations: items.map((i) => ({
        id: i.id,
        costTotal: 0,
        costPerUnit: 0,
        share: 0,
      })),
      residual:
        sealedCost > 0
          ? {
              name: bulkName(sealedProductName),
              costTotal: sealedCost,
              note: "Restposten aus geöffnetem Sealed",
            }
          : null,
    };
  }

  const weights = items.map((item) => {
    if (method === "equal") return 1;
    const w = Math.max(0, item.marketValue) * Math.max(1, item.quantity);
    return w;
  });
  const bulkWeight =
    method === "market" ? Math.max(0, bulkMarketValue) : bulkMarketValue > 0 ? 1 : 0;

  const sumWeights = weights.reduce((s, w) => s + w, 0) + bulkWeight;

  // If all market values are 0, fall back to equal including bulk if present
  const useEqual =
    method === "equal" || sumWeights <= 0;
  const effectiveWeights = useEqual
    ? items.map(() => 1)
    : weights;
  const effectiveBulk = useEqual ? (bulkMarketValue > 0 ? 1 : 0) : bulkWeight;
  const totalW =
    effectiveWeights.reduce((s, w) => s + w, 0) + effectiveBulk;

  const allocations: AllocationResult[] = items.map((item, i) => {
    const share = totalW > 0 ? effectiveWeights[i] / totalW : 0;
    const costTotal = round2(sealedCost * share);
    const qty = Math.max(1, item.quantity);
    return {
      id: item.id,
      costTotal,
      costPerUnit: round2(costTotal / qty),
      share,
    };
  });

  // Fix rounding drift on last non-bulk item
  const allocatedSum = allocations.reduce((s, a) => s + a.costTotal, 0);
  let residualCost = round2(sealedCost - allocatedSum);

  if (effectiveBulk > 0 || residualCost > 0.01) {
    if (effectiveBulk > 0) {
      const bulkShare = totalW > 0 ? effectiveBulk / totalW : 0;
      residualCost = round2(sealedCost * bulkShare);
      // rebalance cards to sealedCost - residual
      const targetCards = round2(sealedCost - residualCost);
      const cardSum = allocations.reduce((s, a) => s + a.costTotal, 0);
      if (cardSum > 0 && Math.abs(cardSum - targetCards) > 0.01) {
        const scale = targetCards / cardSum;
        for (const a of allocations) {
          a.costTotal = round2(a.costTotal * scale);
          const item = items.find((i) => i.id === a.id)!;
          a.costPerUnit = round2(a.costTotal / Math.max(1, item.quantity));
          a.share = sealedCost > 0 ? a.costTotal / sealedCost : 0;
        }
        residualCost = round2(
          sealedCost - allocations.reduce((s, a) => s + a.costTotal, 0),
        );
      }
    } else if (allocations.length > 0) {
      // no bulk: attach drift to last item
      const last = allocations[allocations.length - 1];
      last.costTotal = round2(last.costTotal + residualCost);
      const item = items.find((i) => i.id === last.id)!;
      last.costPerUnit = round2(last.costTotal / Math.max(1, item.quantity));
      residualCost = 0;
    }
  } else {
    residualCost = 0;
  }

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
