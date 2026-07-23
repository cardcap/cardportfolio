"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { SealedOpenDialog } from "@/components/assets/sealed-open-dialog";
import { SealedProductImage } from "@/components/ui/sealed-product-image";
import { formatCurrency } from "@/lib/format";
import { addToLocalCollectionDetailed } from "@/lib/local-collection";
import {
  fetchSealedCached,
  invalidateSealedCache,
  peekSealedCache,
} from "@/lib/assets-client-cache";
import {
  getLocalSealed,
  openLocalSealedUnit,
  removeLocalSealed,
  saveLocalSealed,
  updateLocalSealed,
  SEALED_CHANGED_EVENT,
} from "@/lib/local-sealed";
import {
  getSealedMetrics,
  type SealedCategory,
  type SealedProduct,
} from "@/lib/mock-data";
import type { TcgCard } from "@/lib/pokemon-tcg";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import {
  SealedDetailPanel,
  type SealedDetailSave,
} from "@/components/assets/sealed-detail-panel";

type SortKey =
  | "newest"
  | "name"
  | "name-desc"
  | "value-desc"
  | "value-asc"
  | "profit-desc"
  | "profit-asc";
type ViewMode = "list" | "grid";

const PAGE_SIZES = [25, 50, 100] as const;

const CATEGORIES: Array<SealedCategory | "Alle"> = [
  "Alle",
  "Display",
  "Elite Trainer Box",
  "Booster Bundle",
  "Kollektion",
  "Tin",
  "Blister",
];

const LANGUAGES = ["Alle Sprachen", "DE", "EN", "JP"] as const;
const CONDITIONS = [
  "Alle Zustände",
  "OVP",
  "leichte Mängel",
  "beschädigt",
] as const;

type ApiSealedItem = {
  id: string;
  productKey: string;
  name: string;
  setId: string | null;
  setName: string;
  category: string;
  language: string;
  condition: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate?: string | null;
  marketValue: number;
  imageUrl?: string;
  imageFallbacks?: string[];
  ean?: string;
};

function mapApiSealed(item: ApiSealedItem): SealedProduct {
  const lang =
    item.language === "EN" || item.language === "JP" || item.language === "DE"
      ? item.language
      : "DE";
  const cond =
    item.condition === "leichte Mängel" || item.condition === "beschädigt"
      ? item.condition
      : "OVP";
  return {
    id: item.id,
    name: item.name,
    setName: item.setName,
    category: (item.category as SealedCategory) || "Display",
    language: lang,
    condition: cond,
    quantity: item.quantity,
    purchasePrice: item.purchasePrice,
    purchaseDate: item.purchaseDate ?? null,
    marketValue: item.marketValue,
    imageUrl: item.imageUrl,
    imageFallbacks: item.imageFallbacks,
    ean: item.ean,
  };
}

/** Keep previous list order after open/edit; drop removed, append brand-new. */
function mergeInventoryPreserveOrder(
  previous: SealedProduct[],
  incoming: SealedProduct[],
): SealedProduct[] {
  const byId = new Map(incoming.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const next: SealedProduct[] = [];
  for (const prev of previous) {
    const updated = byId.get(prev.id);
    if (updated) {
      next.push(updated);
      seen.add(prev.id);
    }
  }
  for (const item of incoming) {
    if (!seen.has(item.id)) next.push(item);
  }
  return next;
}

export function SealedView() {
  const { isAuthenticated, isLoading: authLoading } = useAuthMode();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Alle");
  const [setFilter, setSetFilter] = useState("Alle Sets");
  const [language, setLanguage] =
    useState<(typeof LANGUAGES)[number]>("Alle Sprachen");
  const [condition, setCondition] =
    useState<(typeof CONDITIONS)[number]>("Alle Zustände");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZES)[number]>(25);
  const [openProduct, setOpenProduct] = useState<SealedProduct | null>(null);
  const [confirmProduct, setConfirmProduct] =
    useState<SealedProduct | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const warmSealed = peekSealedCache();
  const [inventory, setInventory] = useState<SealedProduct[]>(() => {
    if (!warmSealed?.items?.length) return [];
    return (warmSealed.items as ApiSealedItem[]).map(mapApiSealed);
  });
  const [loading, setLoading] = useState(() => !warmSealed);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  /** Detail panel (like Assets → Karten) */
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const loadInventory = useCallback(
    async (force = false) => {
      if (authLoading) return;

      if (!isAuthenticated) {
        setInventory(getLocalSealed());
        setLoading(false);
        return;
      }

      if (!force) {
        const warm = peekSealedCache();
        if (warm) {
          setInventory(
            ((warm.items as ApiSealedItem[]) ?? []).map(mapApiSealed),
          );
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setLoading(true);
      }

      try {
        const data = await fetchSealedCached(force);
        if (!data) {
          if (!peekSealedCache()) setInventory([]);
          return;
        }
        const items = (data.items ?? []) as ApiSealedItem[];
        setInventory(items.map(mapApiSealed));
      } catch {
        if (!peekSealedCache()) setInventory([]);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, authLoading],
  );

  useEffect(() => {
    void loadInventory(false);
  }, [loadInventory]);

  // Demo: keep listening to localStorage changes
  useEffect(() => {
    if (isAuthenticated) return;
    const onChange = () => setInventory(getLocalSealed());
    window.addEventListener(SEALED_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SEALED_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [isAuthenticated]);

  const handleOpenConfirm = useCallback(
    async (result: {
      product: SealedProduct;
      cards: Array<{
        cardId: string;
        name: string;
        setName?: string;
        collectorId?: string;
        marketValue: number;
        quantity: number;
        costPerUnit: number;
        costTotal: number;
        origin: string;
        tcgCard?: TcgCard;
      }>;
      residual: { name: string; costTotal: number } | null;
    }) => {
      const today = new Date().toISOString().slice(0, 10);
      const lang =
        result.product.language === "EN"
          ? "en"
          : result.product.language === "JP"
            ? "ja"
            : "de";

      // 1) Resolve full catalog cards, then save to DB (login) or localStorage (demo)
      const errors: string[] = [];
      await Promise.all(
        result.cards.map(async (c) => {
          let tcg = c.tcgCard;
          const needsFetch =
            !tcg ||
            !tcg.images?.large ||
            !tcg.rarity ||
            !(
              tcg.cardmarket?.prices?.trendPrice ||
              tcg.cardmarket?.prices?.averageSellPrice
            );

          if (needsFetch && c.cardId) {
            try {
              const params = new URLSearchParams({
                search: c.cardId,
                pageSize: "10",
                page: "1",
                lang,
              });
              const dash = c.cardId.lastIndexOf("-");
              if (dash > 0) {
                params.set("set", c.cardId.slice(0, dash));
              }
              const res = await fetch(`/api/cards?${params}`);
              if (res.ok) {
                const json = (await res.json()) as { data?: TcgCard[] };
                const match =
                  (json.data ?? []).find((x) => x.id === c.cardId) ??
                  (json.data ?? [])[0];
                if (match) tcg = match;
              }
            } catch {
              /* keep partial */
            }
          }

          if (!tcg) {
            tcg = {
              id: c.cardId,
              name: c.name,
              number: c.collectorId ?? "",
              set: {
                id: c.cardId.includes("-")
                  ? c.cardId.slice(0, c.cardId.lastIndexOf("-"))
                  : "",
                name: c.setName ?? result.product.setName,
              },
              images: { small: "", large: "" },
              collectorId: c.collectorId,
              cardmarket: {
                prices: {
                  trendPrice: c.marketValue,
                  averageSellPrice: c.marketValue,
                },
              },
            };
          }

          if (isAuthenticated) {
            try {
              const res = await fetch("/api/collection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tcgCardId: tcg.id,
                  language: lang,
                  condition: "Near Mint",
                  quantity: c.quantity,
                  purchasePrice: c.costPerUnit,
                  purchaseDate: today,
                  origin: c.origin,
                  snapshot: {
                    name: tcg.name,
                    setId: tcg.set?.id,
                    setName: tcg.set?.name,
                    number: tcg.collectorId ?? tcg.number,
                    imageUrl: tcg.images?.large || tcg.images?.small || "",
                    imageFallbacks: tcg.imageFallbacks,
                    rarity: tcg.rarity ?? null,
                  },
                }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                errors.push(
                  typeof data.error === "string"
                    ? data.error
                    : tcg.name,
                );
              }
            } catch {
              errors.push(tcg.name);
            }
          } else {
            addToLocalCollectionDetailed(tcg, {
              language: lang,
              condition: "Near Mint",
              quantity: c.quantity,
              purchasePrice: c.costPerUnit,
              purchaseDate: today,
              origin: c.origin,
            });
          }
        }),
      );

      // 2) Open ONE unit: qty>1 → decrement, qty===1 → remove row
      // Keep list position (do not re-sort by updatedAt to the top).
      const prevQty = result.product.quantity;
      let remainingQty = 0;
      if (isAuthenticated) {
        try {
          const openRes = await fetch("/api/sealed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "open",
              id: result.product.id,
            }),
          });
          if (!openRes.ok) {
            errors.push("Sealed-Eintrag");
          } else {
            const data = await openRes.json().catch(() => ({}));
            const raw = (data.items ?? []) as ApiSealedItem[];
            const mapped = raw.map(mapApiSealed);
            remainingQty =
              mapped.find((i) => i.id === result.product.id)?.quantity ?? 0;
            setInventory((prev) => mergeInventoryPreserveOrder(prev, mapped));
          }
        } catch {
          errors.push("Sealed-Eintrag");
        }
      } else {
        // openLocalSealedUnit mutates in place → order stays
        const next = openLocalSealedUnit(result.product.id);
        setInventory(next);
        remainingQty =
          next.find((i) => i.id === result.product.id)?.quantity ?? 0;
      }

      const cardCount = result.cards.reduce((s, c) => s + c.quantity, 0);
      const target = isAuthenticated
        ? "Assets → Karten (Datenbank)"
        : "Assets → Karten (Demo)";
      const stockNote =
        prevQty > 1
          ? remainingQty > 0
            ? ` · 1× geöffnet, noch ${remainingQty} im Bestand`
            : ` · 1× geöffnet, Bestand leer`
          : ` · „${result.product.name}“ aus Sealed entfernt`;
      setToast(
        errors.length > 0
          ? `${cardCount - errors.length}/${cardCount} Karten gespeichert · Fehler bei: ${errors.slice(0, 3).join(", ")}`
          : `${cardCount} Karte${cardCount === 1 ? "" : "n"} unter ${target}` +
              stockNote +
              (result.residual
                ? ` · Restposten ${result.residual.name}`
                : ""),
      );
      setTimeout(() => setToast(null), 5000);
    },
    [isAuthenticated],
  );

  const setOptions = useMemo(
    () =>
      Array.from(new Set(inventory.map((p) => p.setName))).sort((a, b) =>
        a.localeCompare(b, "de"),
      ),
    [inventory],
  );

  const metrics = useMemo(() => getSealedMetrics(inventory), [inventory]);

  const filtered = useMemo(() => {
    let rows = [...inventory];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.setName.toLowerCase().includes(q) ||
          (p.ean?.includes(q) ?? false),
      );
    }
    if (category !== "Alle") rows = rows.filter((p) => p.category === category);
    if (setFilter !== "Alle Sets")
      rows = rows.filter((p) => p.setName === setFilter);
    if (language !== "Alle Sprachen")
      rows = rows.filter((p) => p.language === language);
    if (condition !== "Alle Zustände")
      rows = rows.filter((p) => p.condition === condition);

    rows.sort((a, b) => {
      const valueA = a.marketValue * a.quantity;
      const valueB = b.marketValue * b.quantity;
      const profitA = valueA - a.purchasePrice * a.quantity;
      const profitB = valueB - b.purchasePrice * b.quantity;
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "name-desc":
          return b.name.localeCompare(a.name, "de");
        case "value-desc":
          return valueB - valueA;
        case "value-asc":
          return valueA - valueB;
        case "profit-desc":
          return profitB - profitA;
        case "profit-asc":
          return profitA - profitB;
        case "newest":
        default:
          // Inventory order (stable across open/edit unless filters hide the row)
          return 0;
      }
    });
    return rows;
  }, [inventory, search, category, setFilter, language, condition, sort]);

  const filteredStats = useMemo(() => {
    const products = filtered.length;
    const units = filtered.reduce((s, p) => s + p.quantity, 0);
    const value = filtered.reduce(
      (s, p) => s + p.marketValue * p.quantity,
      0,
    );
    return { products, units, value };
  }, [filtered]);

  useEffect(() => {
    setCheckedIds((prev) => {
      if (prev.size === 0) return prev;
      const allowed = new Set(filtered.map((p) => p.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filtered]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => checkedIds.has(p.id));
  const someFilteredSelected =
    !allFilteredSelected && filtered.some((p) => checkedIds.has(p.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) setCheckedIds(new Set());
    else setCheckedIds(new Set(filtered.map((p) => p.id)));
  };

  const setRowChecked = (id: string, on: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const removeChecked = async () => {
    if (checkedIds.size === 0) return;
    // Use full inventory, not only current filter page — avoids missed deletes
    const rows = inventory.filter((p) => checkedIds.has(p.id));
    if (rows.length === 0) return;
    const ok = window.confirm(
      rows.length === 1
        ? `„${rows[0].name}“ aus dem Sealed-Inventar entfernen?`
        : `${rows.length} Sealed-Produkte entfernen?`,
    );
    if (!ok) return;

    const removeIds = new Set(rows.map((r) => r.id));
    // Optimistic UI: drop rows immediately
    setInventory((prev) => prev.filter((p) => !removeIds.has(p.id)));
    setCheckedIds(new Set());
    if (detailId && removeIds.has(detailId)) setDetailId(null);

    setBulkBusy(true);
    try {
      if (!isAuthenticated) {
        for (const row of rows) {
          removeLocalSealed(row.id);
        }
        setInventory(getLocalSealed());
      } else {
        const failures: string[] = [];
        for (const row of rows) {
          const res = await fetch(
            `/api/sealed?id=${encodeURIComponent(row.id)}`,
            { method: "DELETE" },
          );
          if (!res.ok) failures.push(row.name);
        }
        invalidateSealedCache();
        await loadInventory(true);
        // Notify portfolio/dashboard hooks to drop cached assets
        window.dispatchEvent(new Event(SEALED_CHANGED_EVENT));
        if (failures.length > 0) {
          window.alert(
            failures.length === 1
              ? `„${failures[0]}“ konnte nicht gelöscht werden.`
              : `${failures.length} Produkte konnten nicht gelöscht werden.`,
          );
        }
      }
    } catch {
      invalidateSealedCache();
        await loadInventory(true);
      window.alert("Löschen fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBulkBusy(false);
    }
  };

  const updateCheckedPurchaseDate = async (isoDate: string) => {
    if (checkedIds.size === 0 || !isoDate) return;
    const rows = filtered.filter((p) => checkedIds.has(p.id));
    if (rows.length === 0) return;

    setBulkBusy(true);
    try {
      for (const row of rows) {
        if (!isAuthenticated) {
          updateLocalSealed(row.id, { purchaseDate: isoDate });
        } else {
          const res = await fetch("/api/sealed", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.id, purchaseDate: isoDate }),
          });
          if (!res.ok) updateLocalSealed(row.id, { purchaseDate: isoDate });
        }
      }
      invalidateSealedCache();
        await loadInventory(true);
      if (!isAuthenticated) setInventory(getLocalSealed());
      setToast(
        `Einkaufsdatum für ${rows.length} Produkt${rows.length === 1 ? "" : "e"} gesetzt`,
      );
      setTimeout(() => setToast(null), 3000);
    } finally {
      setBulkBusy(false);
    }
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (category !== "Alle") {
      chips.push({
        key: "category",
        label: category,
        clear: () => setCategory("Alle"),
      });
    }
    if (setFilter !== "Alle Sets") {
      chips.push({
        key: "set",
        label: setFilter,
        clear: () => setSetFilter("Alle Sets"),
      });
    }
    if (language !== "Alle Sprachen") {
      chips.push({
        key: "lang",
        label: language,
        clear: () => setLanguage("Alle Sprachen"),
      });
    }
    if (condition !== "Alle Zustände") {
      chips.push({
        key: "condition",
        label: condition,
        clear: () => setCondition("Alle Zustände"),
      });
    }
    if (search.trim()) {
      chips.push({
        key: "search",
        label: `„${search.trim()}“`,
        clear: () => setSearch(""),
      });
    }
    return chips;
  }, [category, setFilter, language, condition, search]);

  const resetFilters = () => {
    setSearch("");
    setCategory("Alle");
    setSetFilter("Alle Sets");
    setLanguage("Alle Sprachen");
    setCondition("Alle Zustände");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const detailProduct =
    (detailId && inventory.find((p) => p.id === detailId)) ||
    (detailId && filtered.find((p) => p.id === detailId)) ||
    null;
  const detailIndex = detailProduct
    ? filtered.findIndex((p) => p.id === detailProduct.id)
    : -1;

  async function saveDetail(patch: SealedDetailSave) {
    if (!detailProduct) return;
    setDetailBusy(true);
    try {
      if (!isAuthenticated) {
        const items = getLocalSealed();
        const idx = items.findIndex((p) => p.id === detailProduct.id);
        if (idx >= 0) {
          const next = [...items];
          next[idx] = {
            ...next[idx],
            category: patch.category,
            language: patch.language,
            quantity: patch.quantity,
            condition: patch.condition,
            purchasePrice: patch.purchasePrice,
            purchaseDate: patch.purchaseDate,
            marketValue: patch.marketValue,
          };
          saveLocalSealed(next);
          setInventory(next);
        }
        return;
      }
      const res = await fetch("/api/sealed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: detailProduct.id,
          quantity: patch.quantity,
          condition: patch.condition,
          language: patch.language,
          category: patch.category,
          purchasePrice: patch.purchasePrice,
          purchaseDate: patch.purchaseDate,
          marketValue: patch.marketValue,
        }),
      });
      if (!res.ok) {
        window.alert("Speichern fehlgeschlagen.");
        return;
      }
      invalidateSealedCache();
        await loadInventory(true);
    } finally {
      setDetailBusy(false);
    }
  }

  async function deleteDetail() {
    if (!detailProduct) return;
    const ok = window.confirm(
      `„${detailProduct.name}“ komplett aus dem Sealed-Inventar entfernen?`,
    );
    if (!ok) return;
    const id = detailProduct.id;
    // Optimistic
    setInventory((prev) => prev.filter((p) => p.id !== id));
    setDetailId(null);
    setDetailBusy(true);
    try {
      if (!isAuthenticated) {
        setInventory(removeLocalSealed(id));
      } else {
        const res = await fetch(
          `/api/sealed?id=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          invalidateSealedCache();
        await loadInventory(true);
          window.alert("Löschen fehlgeschlagen.");
          return;
        }
        invalidateSealedCache();
        await loadInventory(true);
      }
    } catch {
      invalidateSealedCache();
        await loadInventory(true);
      window.alert("Löschen fehlgeschlagen.");
    } finally {
      setDetailBusy(false);
    }
  }

  return (
    <div className="pb-4">
      <SealedOpenDialog
        open={!!openProduct}
        product={openProduct}
        onClose={() => setOpenProduct(null)}
        onConfirm={handleOpenConfirm}
      />

      {detailProduct && (
        <SealedDetailPanel
          product={detailProduct}
          busy={detailBusy}
          onClose={() => setDetailId(null)}
          hasPrev={detailIndex > 0}
          hasNext={detailIndex >= 0 && detailIndex < filtered.length - 1}
          onPrev={() => {
            if (detailIndex > 0) setDetailId(filtered[detailIndex - 1].id);
          }}
          onNext={() => {
            if (detailIndex >= 0 && detailIndex < filtered.length - 1) {
              setDetailId(filtered[detailIndex + 1].id);
            }
          }}
          onOpenProduct={() => {
            setConfirmProduct(detailProduct);
          }}
          onDelete={() => void deleteDetail()}
          onSave={(patch) => saveDetail(patch)}
        />
      )}

      {confirmProduct && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50"
            aria-label="Schließen"
            onClick={() => setConfirmProduct(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sealed-open-confirm-title"
            className="fixed inset-x-4 top-[20%] z-50 mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:inset-x-auto"
          >
            <h2
              id="sealed-open-confirm-title"
              className="text-lg font-semibold"
            >
              Sealed wirklich öffnen?
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Bist du sicher, dass du{" "}
              <span className="font-medium text-[var(--foreground)]">
                „{confirmProduct.name}“
              </span>{" "}
              öffnen möchtest?
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--muted)]">
              <li className="flex gap-2">
                <span className="text-[var(--accent)]" aria-hidden>
                  ·
                </span>
                <span>
                  Das Produkt verschwindet aus der Sealed-Liste.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)]" aria-hidden>
                  ·
                </span>
                <span>
                  Die gezogenen Karten erscheinen unter{" "}
                  <Link
                    href="/assets/karten"
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    Assets → Karten
                  </Link>
                  .
                </span>
              </li>
            </ul>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmProduct(null)}
                className="h-10 flex-1 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenProduct(confirmProduct);
                  setConfirmProduct(null);
                }}
                className="h-10 flex-1 rounded-full bg-[var(--accent)] text-sm font-medium text-white hover:brightness-110"
              >
                Ja, öffnen
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="mb-4 rounded-xl border border-[var(--positive)]/30 bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive)]">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs text-[var(--muted)]">
            <Link href="/assets/karten" className="hover:text-[var(--foreground)]">
              Assets
            </Link>
            <span className="mx-1.5 opacity-50">/</span>
            <span className="text-[var(--foreground)]">Sealed</span>
            <span className="mx-1.5 opacity-50">·</span>
            <Link href="/assets/karten" className="hover:text-[var(--foreground)]">
              Karten
            </Link>
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            Sealed Produkte
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Displays, Boxen und weitere originalverpackte Produkte verwalten
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ImportIcon />
            Excel-Import
          </button>
          <Link
            href="/kartendatenbank"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white transition-all hover:brightness-110"
          >
            <span className="text-base leading-none">+</span>
            Produkt hinzufügen
          </Link>
        </div>
      </div>

      {/* Metrics (Screenshot-Layout, ohne alte 6er-Unterteilung) */}
      <SealedMetricsPanel inventory={inventory} metrics={metrics} />

      {/* Toolbar: Suche + Filter (Sortierung in der Filtergruppe, Toggle rechts) */}
      <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
        <label className="relative min-w-0 flex-1 xl:max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Produkt, Set oder Produktnummer suchen"
            className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          />
        </label>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as typeof category);
              setPage(1);
            }}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "Alle" ? "Alle Kategorien" : c}
              </option>
            ))}
          </select>

          <select
            value={setFilter}
            onChange={(e) => {
              setSetFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            <option value="Alle Sets">Alle Sets</option>
            {setOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as typeof language);
              setPage(1);
            }}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value as typeof condition);
              setPage(1);
            }}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="name">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="value-desc">Marktwert: höchster zuerst</option>
            <option value="value-asc">Marktwert: niedrigster zuerst</option>
            <option value="profit-desc">Gewinn: höchster zuerst</option>
            <option value="profit-asc">Gewinn: niedrigster zuerst</option>
          </select>
        </div>

        <div className="flex h-10 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5 xl:ml-auto">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex h-full items-center justify-center rounded-full px-3 ${
              view === "list"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Listenansicht"
            aria-pressed={view === "list"}
          >
            <ListIcon />
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`inline-flex h-full items-center justify-center rounded-full px-3 ${
              view === "grid"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-label="Kachelansicht"
            aria-pressed={view === "grid"}
          >
            <GridIcon />
          </button>
        </div>
      </div>

      {/* Active filter chips + summary */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-h-[1.75rem] flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                chip.clear();
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]"
            >
              {chip.label}
              <span aria-hidden className="opacity-70">
                ×
              </span>
            </button>
          ))}
          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Alle zurücksetzen
            </button>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          {filtered.length > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someFilteredSelected;
                }}
                onChange={toggleSelectAllFiltered}
                className="h-3.5 w-3.5 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                aria-label="Alle gefilterten Produkte auswählen"
              />
              Alle auswählen
            </label>
          )}
          <p>
            {filteredStats.products.toLocaleString("de-DE")} Produkte
            <span className="mx-1.5 opacity-40">·</span>
            {filteredStats.units.toLocaleString("de-DE")} Stück
            <span className="mx-1.5 opacity-40">·</span>
            Marktwert {formatCurrency(filteredStats.value)}
            {checkedIds.size > 0 && (
              <span className="ml-2 text-[var(--accent)]">
                · {checkedIds.size.toLocaleString("de-DE")} ausgewählt
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Bestand: full-width table (Produkt → Bestand, no unit price subtotals) */}
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {view === "list" ? (
          <>
            {/* Mobile list */}
            <ul className="divide-y divide-[var(--border)] lg:hidden">
              {pageRows.map((row) => (
                <SealedRow
                  key={row.id}
                  product={row}
                  checked={checkedIds.has(row.id)}
                  onCheckedChange={(on) => setRowChecked(row.id, on)}
                  onOpen={() => setConfirmProduct(row)}
                  onSelect={() => setDetailId(row.id)}
                />
              ))}
              {pageRows.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-[var(--muted)]">
                  {loading
                    ? "Sealed-Inventar wird geladen…"
                    : isAuthenticated
                      ? "Keine Sealed-Produkte. Füge Produkte hinzu oder öffne die Demo-Seed."
                      : "Keine Produkte für diese Filter."}
                </li>
              )}
            </ul>

            {/* Desktop: full-page table, Bestand right after Produkt */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <thead>
                  {/* Same header type as Assets → Karten */}
                  <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
                    <th className="w-10 px-2 py-3 text-center align-middle font-medium">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredSelected;
                        }}
                        onChange={toggleSelectAllFiltered}
                        className="mx-auto block h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                        aria-label="Alle auswählen"
                      />
                    </th>
                    <th className="min-w-[14rem] px-3 py-3 font-medium">
                      Produkt
                    </th>
                    <th className="px-3 py-3 text-right font-medium">
                      Bestand
                    </th>
                    <th className="px-3 py-3 font-medium">Kategorie</th>
                    <th className="px-3 py-3 font-medium">Sprache</th>
                    <th className="px-3 py-3 font-medium">Zustand</th>
                    <th className="px-3 py-3 text-right font-medium">
                      EK / Stück
                    </th>
                    <th className="px-3 py-3 text-right font-medium">
                      Marktwert / Stück
                    </th>
                    <th className="px-3 py-3 text-right font-medium">
                      Gesamtwert
                    </th>
                    <th className="px-3 py-3 text-right font-medium">
                      Gewinn / Verlust
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <SealedTableRow
                      key={row.id}
                      product={row}
                      checked={checkedIds.has(row.id)}
                      onCheckedChange={(on) => setRowChecked(row.id, on)}
                      onOpen={() => setConfirmProduct(row)}
                      onSelect={() => setDetailId(row.id)}
                      selected={detailId === row.id}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-5 py-12 text-center text-sm text-[var(--muted)]"
                      >
                        {loading
                          ? "Sealed-Inventar wird geladen…"
                          : isAuthenticated
                            ? "Keine Sealed-Produkte. Füge Produkte hinzu oder öffne die Demo-Seed."
                            : "Keine Produkte für diese Filter."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="grid w-full gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageRows.map((row) => (
              <SealedCard
                key={row.id}
                product={row}
                checked={checkedIds.has(row.id)}
                onCheckedChange={(on) => setRowChecked(row.id, on)}
                onOpen={() => setConfirmProduct(row)}
                onSelect={() => setDetailId(row.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination outside table box (like Assets → Karten) */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-xs text-[var(--muted)]">
          <p>
            {filtered.length === 0
              ? "0"
              : `${((safePage - 1) * pageSize + 1).toLocaleString("de-DE")}–${Math.min(safePage * pageSize, filtered.length).toLocaleString("de-DE")}`}{" "}
            von {filtered.length.toLocaleString("de-DE")} Produkten
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5">
            <span aria-hidden>ℹ</span>
            Marktpreise zuletzt aktualisiert: {metrics.pricesUpdatedLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40"
            aria-label="Vorherige Seite"
          >
            ‹
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let n: number;
            if (totalPages <= 5) n = i + 1;
            else if (safePage <= 3) n = i + 1;
            else if (safePage >= totalPages - 2) n = totalPages - 4 + i;
            else n = safePage - 2 + i;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm ${
                  n === safePage
                    ? "bg-[var(--accent)] font-medium text-white"
                    : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {n}
              </button>
            );
          })}
          {totalPages > 5 && safePage < totalPages - 2 && (
            <>
              <span className="px-1 text-[var(--muted)]">…</span>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-[var(--border)] px-2 text-sm text-[var(--muted)]"
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] disabled:opacity-40"
            aria-label="Nächste Seite"
          >
            ›
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Pro Seite
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(
                Number(e.target.value) as (typeof PAGE_SIZES)[number],
              );
              setPage(1);
            }}
            className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--foreground)]"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <BulkActionBar
        selectedCount={checkedIds.size}
        totalCount={filtered.length}
        allSelected={allFilteredSelected}
        busy={bulkBusy}
        onSelectAll={toggleSelectAllFiltered}
        onClear={() => setCheckedIds(new Set())}
        onDelete={() => void removeChecked()}
        onPurchaseDate={(d) => updateCheckedPurchaseDate(d)}
      />
    </div>
  );
}

const openBtnClass =
  "inline-flex items-center justify-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/15";

/** Mobile sealed list row */
function SealedRow({
  product,
  checked,
  onCheckedChange,
  onOpen,
  onSelect,
}: {
  product: SealedProduct;
  checked: boolean;
  onCheckedChange: (on: boolean) => void;
  onOpen: () => void;
  onSelect: () => void;
}) {
  const totalMarket = product.marketValue * product.quantity;
  const totalCost = product.purchasePrice * product.quantity;
  const profit = totalMarket - totalCost;
  const positive = profit >= 0;

  return (
    <li
      className={`px-4 py-3 transition-colors sm:px-5 ${
        checked
          ? "bg-[var(--accent-soft)]"
          : "hover:bg-[var(--surface-elevated)]/50"
      }`}
    >
      <div className="flex gap-3">
        <label className="flex shrink-0 items-start pt-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
            aria-label={`${product.name} auswählen`}
          />
        </label>
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 gap-3 text-left"
        >
          <ProductThumb product={product} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {product.setName}
                </p>
              </div>
              <CategoryBadge category={product.category} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
              <span className="tabular-nums font-medium text-[var(--foreground)]">
                Bestand ×{product.quantity}
              </span>
              <span>{product.language}</span>
              <ConditionBadge condition={product.condition} />
            </div>
          </div>
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 pl-10">
        <button type="button" onClick={onOpen} className={openBtnClass}>
          Öffnen →
        </button>
        <div className="text-right">
          <p className="tabular-nums text-sm font-medium">
            {formatCurrency(totalMarket)}
          </p>
          <p
            className={`tabular-nums text-xs font-medium ${
              positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {positive ? "+" : ""}
            {formatCurrency(profit)}
          </p>
        </div>
      </div>
    </li>
  );
}

/** Desktop full-width table row — Produkt, then Bestand, no price subtotals */
function SealedTableRow({
  product,
  checked,
  onCheckedChange,
  onOpen,
  onSelect,
  selected,
}: {
  product: SealedProduct;
  checked: boolean;
  onCheckedChange: (on: boolean) => void;
  onOpen: () => void;
  onSelect: () => void;
  selected?: boolean;
}) {
  const totalMarket = product.marketValue * product.quantity;
  const totalCost = product.purchasePrice * product.quantity;
  const profit = totalMarket - totalCost;
  const profitPct = totalCost ? (profit / totalCost) * 100 : 0;
  const positive = profit >= 0;

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors ${
        checked || selected
          ? "bg-[var(--accent-soft)]"
          : "hover:bg-[var(--surface-elevated)]/50"
      }`}
    >
      <td
        className="w-10 px-2 py-3 text-center align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mx-auto block h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
          aria-label={`${product.name} auswählen`}
        />
      </td>
      <td className="min-w-[14rem] px-3 py-3 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <ProductThumb product={product} />
          <div className="min-w-0">
            <p className="truncate font-medium">{product.name}</p>
            <p className="truncate text-xs text-[var(--muted)]">
              {product.setName}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right align-middle tabular-nums text-sm font-medium">
        {product.quantity}
      </td>
      <td className="px-3 py-3 align-middle">
        <CategoryBadge category={product.category} />
      </td>
      <td className="px-3 py-3 align-middle text-sm text-[var(--muted)]">
        {product.language}
      </td>
      <td className="px-3 py-3 align-middle">
        <ConditionBadge condition={product.condition} />
      </td>
      <td className="px-3 py-3 text-right align-middle tabular-nums text-sm">
        {formatCurrency(product.purchasePrice)}
      </td>
      <td className="px-3 py-3 text-right align-middle tabular-nums text-sm">
        {formatCurrency(product.marketValue)}
      </td>
      <td className="px-3 py-3 text-right align-middle tabular-nums text-sm font-medium">
        {formatCurrency(totalMarket)}
      </td>
      <td className="px-3 py-3 text-right align-middle">
        <p
          className={`tabular-nums text-sm font-medium ${
            positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
          }`}
        >
          {positive ? "+" : ""}
          {formatCurrency(profit)}
        </p>
        <p
          className={`tabular-nums text-[10px] ${
            positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
          }`}
        >
          {positive ? "+" : ""}
          {profitPct.toLocaleString("de-DE", { maximumFractionDigits: 2 })} %
        </p>
      </td>
      <td
        className="px-3 py-3 text-right align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onOpen}
          className={openBtnClass}
          title="Produkt öffnen"
        >
          Öffnen
        </button>
      </td>
    </tr>
  );
}

function SealedCard({
  product,
  checked,
  onCheckedChange,
  onOpen,
  onSelect,
}: {
  product: SealedProduct;
  checked: boolean;
  onCheckedChange: (on: boolean) => void;
  onOpen: () => void;
  onSelect: () => void;
}) {
  const totalMarket = product.marketValue * product.quantity;
  const profit =
    totalMarket - product.purchasePrice * product.quantity;
  const positive = profit >= 0;

  return (
    <div
      className={`relative rounded-xl border p-4 ${
        checked
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--border)] bg-[var(--surface-elevated)]/40"
      }`}
    >
      <label
        className="absolute left-3 top-3 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-[var(--surface)]/90 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
          aria-label={`${product.name} auswählen`}
        />
      </label>
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left"
      >
        <div className="flex gap-3">
          <ProductThumb product={product} large />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="truncate text-xs text-[var(--muted)]">
              {product.setName}
            </p>
            <div className="mt-2">
              <CategoryBadge category={product.category} />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="tabular-nums text-sm font-medium">
              {formatCurrency(totalMarket)}
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              ×{product.quantity}
            </p>
          </div>
          <p
            className={`tabular-nums text-sm font-medium ${
              positive ? "text-[var(--positive)]" : "text-[var(--negative)]"
            }`}
          >
            {positive ? "+" : ""}
            {formatCurrency(profit)}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className={`mt-2 w-full ${openBtnClass}`}
      >
        Öffnen
      </button>
    </div>
  );
}

function ProductThumb({
  product,
  large,
}: {
  product: SealedProduct;
  large?: boolean;
}) {
  return (
    <SealedProductImage
      src={product.imageUrl}
      fallbacks={product.imageFallbacks}
      alt={product.name}
      badge={product.category}
      language={product.language}
      size="sm"
      className={
        large
          ? "!h-16 !w-16 shrink-0 ring-1 ring-[var(--border)]"
          : "!h-12 !w-12 shrink-0 ring-1 ring-[var(--border)]"
      }
    />
  );
}

function CategoryBadge({ category }: { category: SealedCategory }) {
  return (
    <span className="inline-flex w-fit rounded-md bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)] ring-1 ring-[var(--border)]">
      {category}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: SealedProduct["condition"] }) {
  const styles =
    condition === "beschädigt"
      ? "bg-red-500/15 text-red-300 ring-red-400/25"
      : condition === "leichte Mängel"
        ? "bg-amber-500/15 text-amber-300 ring-amber-400/25"
        : "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25";
  return (
    <span
      className={`inline-flex w-fit rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${styles}`}
    >
      {condition}
    </span>
  );
}

type SealedMetrics = ReturnType<typeof getSealedMetrics>;

/** Top KPI row + Bestand nach Produkttyp */
function SealedMetricsPanel({
  inventory,
  metrics,
}: {
  inventory: SealedProduct[];
  metrics: SealedMetrics;
}) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const weeklyAbs =
    Math.round(metrics.totalValue * (metrics.weeklyChange / 100) * 100) / 100;
  const avgPurchase =
    metrics.totalUnits > 0
      ? Math.round((metrics.invested / metrics.totalUnits) * 100) / 100
      : 0;
  const profitPositive = metrics.profitLoss >= 0;

  const byType = (() => {
    const buckets = {
      Displays: 0,
      "Elite Trainer Boxen": 0,
      Tins: 0,
      Bundles: 0,
    };
    for (const p of inventory) {
      const q = Math.max(0, p.quantity);
      if (p.category === "Display") buckets.Displays += q;
      else if (p.category === "Elite Trainer Box")
        buckets["Elite Trainer Boxen"] += q;
      else if (p.category === "Tin") buckets.Tins += q;
      else buckets.Bundles += q;
    }
    return buckets;
  })();

  const typeTotal =
    byType.Displays +
    byType["Elite Trainer Boxen"] +
    byType.Tins +
    byType.Bundles;

  const typeItems = [
    {
      key: "Displays",
      label: "Displays",
      count: byType.Displays,
      color: "#f9a8d4",
      icon: "display" as const,
    },
    {
      key: "etb",
      label: "Elite Trainer Boxen",
      count: byType["Elite Trainer Boxen"],
      color: "#f472b6",
      icon: "etb" as const,
    },
    {
      key: "Tins",
      label: "Tins",
      count: byType.Tins,
      color: "#ec4899",
      icon: "tin" as const,
    },
    {
      key: "Bundles",
      label: "Bundles",
      count: byType.Bundles,
      color: "#be185d",
      icon: "bundle" as const,
    },
  ];

  return (
    <div className="mb-5 w-full min-w-0 space-y-3">
      <div className="grid w-full grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          icon="chart"
          label="Gesamtwert"
          value={formatCurrency(metrics.totalValue)}
          hint={
            <>
              <span className="text-[var(--positive)]">
                {weeklyAbs >= 0 ? "+" : ""}
                {formatCurrency(weeklyAbs)}
              </span>
              <span className="mx-1 opacity-50">·</span>
              <span className="text-[var(--positive)]">
                {metrics.weeklyChange >= 0 ? "+" : ""}
                {metrics.weeklyChange.toLocaleString("de-DE", {
                  maximumFractionDigits: 1,
                })}{" "}
                % (7 Tage)
              </span>
            </>
          }
        />
        <MetricCard
          icon="wallet"
          label="Investiert"
          value={formatCurrency(metrics.invested)}
          hint={
            <span className="text-[var(--muted)]">
              Ø {formatCurrency(avgPurchase)} Einkaufspreis
            </span>
          }
        />
        <MetricCard
          icon="trend"
          label="Unrealisierter Gewinn"
          value={`${profitPositive ? "+" : ""}${formatCurrency(metrics.profitLoss)}`}
          valueClass={
            profitPositive ? "text-[var(--positive)]" : "text-[var(--negative)]"
          }
          hint={
            <span
              className={
                profitPositive
                  ? "text-[var(--positive)]"
                  : "text-[var(--negative)]"
              }
            >
              {profitPositive ? "+" : ""}
              {metrics.returnRate.toLocaleString("de-DE", {
                maximumFractionDigits: 1,
              })}{" "}
              % Rendite
            </span>
          }
        />
        <MetricCard
          icon="cube"
          label="Exemplare gesamt"
          value={String(metrics.totalUnits)}
          hint={
            <span className="text-[var(--muted)]">
              {metrics.productCount} verschiedene Produkt
              {metrics.productCount === 1 ? "" : "e"}
            </span>
          }
        />
      </div>

      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
          Bestand nach Produkttyp
        </p>
        <div className="mt-4 flex h-2.5 w-full items-center overflow-visible rounded-full bg-[var(--border)]">
          <div className="flex h-full w-full overflow-visible rounded-full">
            {typeTotal > 0 ? (
              typeItems.map((s, i) => {
                const active = hoveredType === s.key;
                const dimmed = hoveredType != null && !active;
                return (
                  <div
                    key={s.key}
                    className={[
                      "relative h-full transition-[filter,opacity] duration-200 ease-out",
                      i === 0 ? "rounded-l-full" : "",
                      i === typeItems.length - 1 ? "rounded-r-full" : "",
                      dimmed ? "opacity-35" : "opacity-100",
                      active
                        ? "z-[1] animate-[sealedBarPulse_1.4s_ease-in-out_infinite]"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      width: `${(s.count / typeTotal) * 100}%`,
                      backgroundColor: s.color,
                      minWidth: s.count > 0 ? 4 : 0,
                    }}
                    title={`${s.label}: ${s.count}`}
                  />
                );
              })
            ) : (
              <div className="h-full w-full rounded-full bg-[var(--border-strong)]/40" />
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {typeItems.map((item) => (
            <div
              key={item.key}
              onMouseEnter={() => setHoveredType(item.key)}
              onMouseLeave={() => setHoveredType(null)}
              className={[
                "flex min-w-0 cursor-default items-center gap-3 rounded-xl border bg-[var(--background)]/50 px-3 py-3 transition-colors sm:gap-3.5 sm:px-4",
                hoveredType === item.key
                  ? "border-[var(--accent)]/35 bg-[var(--accent-soft)]/40"
                  : "border-[var(--border)]",
              ].join(" ")}
            >
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-[var(--border)] sm:h-11 sm:w-11"
                style={{
                  backgroundColor: `${item.color}18`,
                  color: item.color,
                }}
              >
                <TypeIcon kind={item.icon} />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)] sm:text-[15px]">
                {item.label}
              </p>
              <p className="tabular-nums shrink-0 text-2xl font-semibold leading-none tracking-tight">
                {item.count}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  valueClass = "",
}: {
  icon: "chart" | "wallet" | "trend" | "cube";
  label: string;
  value: string;
  hint?: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--muted)] ring-1 ring-[var(--border)]">
        {icon === "chart" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M4 19V5M4 19h16" />
            <path d="M7 15l4-5 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {icon === "wallet" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <path d="M3 10h18" />
            <circle cx="16" cy="14" r="1.25" fill="currentColor" />
          </svg>
        )}
        {icon === "trend" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M4 18 10 11l4 3 6-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {icon === "cube" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
            <path d="M12 12 4 7M12 12l8-5M12 12v10" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
          {label}
        </p>
        <p className={`tabular-nums mt-1 text-xl font-semibold tracking-tight ${valueClass}`}>
          {value}
        </p>
        {hint && <p className="mt-1 text-xs leading-snug">{hint}</p>}
      </div>
    </div>
  );
}

function TypeIcon({ kind }: { kind: "display" | "etb" | "tin" | "bundle" }) {
  if (kind === "display") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="4" y="3" width="16" height="14" rx="1.5" />
        <path d="M8 21h8M12 17v4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "etb") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
        <path d="M12 12 4 7M12 12l8-5M12 12v10" />
      </svg>
    );
  }
  if (kind === "tin") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <ellipse cx="12" cy="7" rx="6" ry="2.5" />
        <path d="M6 7v9c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 8h12l-1 11H7L6 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" strokeLinecap="round" />
      <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
