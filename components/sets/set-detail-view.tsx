"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CollectionEditPanel,
  demoCopiesFromQty,
  type CollectionCopy,
} from "@/components/sets/collection-edit-panel";
import { SetCardDetailPanel } from "@/components/sets/set-card-detail-panel";
import { CardImage } from "@/components/ui/card-image";
import { SetLogo } from "@/components/ui/set-logo";
import { getCardGlowColor } from "@/lib/card-colors";
import { formatCurrency, formatDateDE } from "@/lib/format";
import {
  getCardImageFallbacks,
  getCardImageUrl,
  getCardPrice,
  type TcgCard,
} from "@/lib/pokemon-tcg";
import { formatRarityEnglish } from "@/lib/rarity-labels";
import type { SetDetail } from "@/lib/set-stats";
import { wishlistItemFromTcg } from "@/lib/wishlist";
import { useWishlist } from "@/components/wishlist-provider";

type SetDetailViewProps = {
  setId: string;
  setDetail: SetDetail;
  initialCards: TcgCard[];
  totalCount: number;
};

type SortKey =
  | "number-asc"
  | "number-desc"
  | "name"
  | "rarity"
  | "price-desc"
  | "price-asc";

/** Deterministic demo ownership for checklist UX */
function demoOwnedQty(cardId: string): number {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = (h * 33 + cardId.charCodeAt(i)) >>> 0;
  const r = h % 100;
  if (r < 38) return 0; // missing
  if (r < 82) return 1;
  if (r < 94) return 2;
  return 3;
}

function parseCardNumber(card: TcgCard): number {
  const raw = (card.number || card.collectorId || "").split("/")[0];
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function isSecretRare(card: TcgCard, official: number): boolean {
  const n = parseCardNumber(card);
  if (official > 0 && n > official) return true;
  const r = (card.rarity ?? "").toLowerCase();
  return (
    r.includes("secret") ||
    r.includes("illustration") ||
    r.includes("special illustration") ||
    r.includes("hyper rare") ||
    r.includes("gold")
  );
}

export function SetDetailView({
  setDetail,
  initialCards,
  totalCount,
}: SetDetailViewProps) {
  const official = setDetail.officialCards || totalCount;
  const secretCount = setDetail.secretRareCount;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const [rarity, setRarity] = useState("Alle");
  const [variant, setVariant] = useState("Alle");
  const [sort, setSort] = useState<SortKey>("number-asc");
  const [grayMissing, setGrayMissing] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [secretOpen, setSecretOpen] = useState(true);
  const [copyOverrides, setCopyOverrides] = useState<
    Record<string, CollectionCopy[]>
  >({});
  const { toggleItem } = useWishlist();

  const ownership = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of initialCards) {
      map.set(card.id, demoOwnedQty(card.id));
    }
    return map;
  }, [initialCards]);

  const ownedCount = useMemo(() => {
    let n = 0;
    for (const card of initialCards) {
      const qty = copyOverrides[card.id]
        ? copyOverrides[card.id].length
        : ownership.get(card.id) ?? 0;
      if (qty > 0) n += 1;
    }
    return n;
  }, [initialCards, ownership, copyOverrides]);

  const progress =
    totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of initialCards) {
      if (c.category) set.add(c.category);
      if (c.types) c.types.forEach((t) => set.add(t));
    }
    return ["Alle", ...[...set].sort((a, b) => a.localeCompare(b, "de"))];
  }, [initialCards]);

  const rarities = useMemo(() => {
    const set = new Set<string>();
    for (const c of initialCards) {
      if (c.rarity) set.add(formatRarityEnglish(c.rarity));
    }
    return ["Alle", ...[...set].sort((a, b) => a.localeCompare(b, "de"))];
  }, [initialCards]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = initialCards.filter((card) => {
      if (term) {
        const hay = [card.name, card.number, card.collectorId ?? "", card.id]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (category !== "Alle") {
        const matchCat =
          card.category === category || card.types?.includes(category);
        if (!matchCat) return false;
      }
      if (rarity !== "Alle") {
        if (formatRarityEnglish(card.rarity ?? "") !== rarity) return false;
      }
      if (variant === "Owned") {
        if ((ownership.get(card.id) ?? 0) <= 0) return false;
      } else if (variant === "Missing") {
        if ((ownership.get(card.id) ?? 0) > 0) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "number-desc":
          return parseCardNumber(b) - parseCardNumber(a);
        case "name":
          return a.name.localeCompare(b.name, "de");
        case "rarity":
          return (a.rarity ?? "").localeCompare(b.rarity ?? "", "de");
        case "price-desc":
          return (getCardPrice(b) ?? 0) - (getCardPrice(a) ?? 0);
        case "price-asc":
          return (getCardPrice(a) ?? 0) - (getCardPrice(b) ?? 0);
        case "number-asc":
        default:
          return parseCardNumber(a) - parseCardNumber(b);
      }
    });

    return rows;
  }, [initialCards, search, category, rarity, variant, sort, ownership]);

  const mainCards = useMemo(
    () => filtered.filter((c) => !isSecretRare(c, official)),
    [filtered, official],
  );
  const secretCards = useMemo(
    () => filtered.filter((c) => isSecretRare(c, official)),
    [filtered, official],
  );

  const secretOwned = useMemo(() => {
    let n = 0;
    for (const c of initialCards) {
      if (isSecretRare(c, official) && (ownership.get(c.id) ?? 0) > 0) n++;
    }
    return n;
  }, [initialCards, official, ownership]);

  const secretMissing = Math.max(0, secretCount - secretOwned);

  // Build ordered nav list: main set numbers first, then secrets
  const orderedNav = useMemo(
    () => [...mainCards, ...secretCards],
    [mainCards, secretCards],
  );

  const selected =
    orderedNav.find((c) => c.id === selectedId) ??
    filtered.find((c) => c.id === selectedId) ??
    initialCards.find((c) => c.id === selectedId) ??
    null;

  const selectedIndex = selected
    ? orderedNav.findIndex((c) => c.id === selected.id)
    : -1;

  const openCard = (id: string) => {
    setSelectedId(id);
    setEditOpen(false);
    setPanelOpen(true);
  };

  const displayQty = (cardId: string) => {
    if (copyOverrides[cardId]) return copyOverrides[cardId].length;
    return ownership.get(cardId) ?? 0;
  };

  const copiesForSelected = selected
    ? copyOverrides[selected.id] ??
      demoCopiesFromQty(
        selected.id,
        ownership.get(selected.id) ?? 0,
        getCardPrice(selected),
      )
    : [];

  const goPrev = () => {
    if (selectedIndex > 0) setSelectedId(orderedNav[selectedIndex - 1].id);
  };
  const goNext = () => {
    if (selectedIndex >= 0 && selectedIndex < orderedNav.length - 1) {
      setSelectedId(orderedNav[selectedIndex + 1].id);
    }
  };

  const positionLabel = (() => {
    if (!selected) return "";
    const n = parseCardNumber(selected);
    if (n > 0) {
      return `${String(n).padStart(3, "0")} / ${String(official).padStart(3, "0")}`;
    }
    return selected.number;
  })();

  const logoFallbacks = [
    setDetail.symbolUrl,
    `https://images.pokemontcg.io/${setDetail.id}/logo.png`,
  ].filter(Boolean) as string[];

  return (
    <>
      <div
        className={`pb-8 transition-[padding] ${
          panelOpen || editOpen ? "lg:pr-[min(27rem,calc(100vw-2rem))]" : ""
        }`}
      >
        {/* Breadcrumb + tools */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--muted)]">
            <Link href="/sets" className="hover:text-[var(--foreground)]">
              Sets
            </Link>
            <span className="mx-1.5 opacity-50">/</span>
            <span>{setDetail.seriesName}</span>
            <span className="mx-1.5 opacity-50">/</span>
            <span className="text-[var(--foreground)]">{setDetail.name}</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-[var(--border)] p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-full p-2 ${
                  view === "list"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)]"
                }`}
                aria-label="Liste"
              >
                <ListIcon />
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`rounded-full p-2 ${
                  view === "grid"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)]"
                }`}
                aria-label="Raster"
              >
                <GridIcon />
              </button>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)]"
              aria-label="Benachrichtigungen"
            >
              <BellIcon />
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 to-black sm:h-24 sm:w-44">
              <SetLogo
                src={setDetail.logoUrl}
                fallbacks={logoFallbacks}
                alt={setDetail.name}
                size="lg"
                className="!h-full !w-full !rounded-xl bg-transparent"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {setDetail.name}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {setDetail.seriesName}
                <span className="mx-1.5 opacity-40">·</span>
                Deutsch
                {setDetail.releaseDate && (
                  <>
                    <span className="mx-1.5 opacity-40">·</span>
                    Erschienen am {formatDateDE(setDetail.releaseDate)}
                  </>
                )}
              </p>

              <div className="mt-3 max-w-md">
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                  <span className="tabular-nums font-semibold text-[var(--accent)]">
                    {ownedCount} / {totalCount} Karten
                  </span>
                  <span className="tabular-nums text-[var(--muted)]">
                    · {progress} %
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {secretCount > 0 && (
                  <p className="mt-1.5 text-xs text-[var(--muted)]">
                    {secretMissing > 0
                      ? `${secretMissing} Secret Rares noch nicht enthalten`
                      : "Alle Secret Rares enthalten"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white hover:brightness-110"
            >
              <span className="text-base leading-none">+</span>
              Karte hinzufügen
            </button>
            <Link
              href="/sets"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              ← Zur Set-Übersicht
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <label className="relative min-w-0 flex-1 lg:max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name oder Sammelnummer suchen"
              className="h-9 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-0 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            />
          </label>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "Alle" ? "Alle Kategorien" : c}
              </option>
            ))}
          </select>

          <select
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
            className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            {rarities.map((r) => (
              <option key={r} value={r}>
                {r === "Alle" ? "Alle Seltenheiten" : r}
              </option>
            ))}
          </select>

          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)] outline-none focus:border-[var(--accent)] focus:text-[var(--foreground)]"
          >
            <option value="Alle">Alle Varianten</option>
            <option value="Owned">Nur vorhanden</option>
            <option value="Missing">Nur fehlend</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="number-asc">Sammelnummer: aufsteigend</option>
            <option value="number-desc">Sammelnummer: absteigend</option>
            <option value="name">Name A–Z</option>
            <option value="rarity">Seltenheit</option>
            <option value="price-desc">Preis: höchster zuerst</option>
            <option value="price-asc">Preis: niedrigster zuerst</option>
          </select>

          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--muted)]">
            Fehlende ausgrauen
            <button
              type="button"
              role="switch"
              aria-checked={grayMissing}
              onClick={() => setGrayMissing((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                grayMissing ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  grayMissing ? "left-4" : "left-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Main set grid */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-[var(--muted)]">
              Hauptset
              <span className="ml-2 font-normal">
                · 001–
                {String(official).padStart(3, "0")}
              </span>
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {mainCards.filter((c) => (ownership.get(c.id) ?? 0) > 0).length}/
              {mainCards.length}
            </span>
          </div>

          {mainCards.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Keine Karten für die gewählten Filter.
            </p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {mainCards.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  qty={displayQty(card.id)}
                  grayMissing={grayMissing}
                  official={official}
                  selected={
                    card.id === selectedId && (panelOpen || editOpen)
                  }
                  onClick={() => openCard(card.id)}
                />
              ))}
            </div>
          ) : (
            <CardList
              cards={mainCards}
              getQty={displayQty}
              official={official}
              selectedId={panelOpen || editOpen ? selectedId : null}
              onOpen={openCard}
            />
          )}
        </section>

        {/* Secret rares */}
        {(secretCards.length > 0 || secretCount > 0) && (
          <section>
            <button
              type="button"
              onClick={() => setSecretOpen((o) => !o)}
              className="mb-3 flex w-full items-center justify-between gap-3 text-left"
            >
              <h2 className="text-sm font-medium text-[var(--muted)]">
                Secret Rares
                <span className="ml-2 font-normal">
                  · {String(official + 1).padStart(3, "0")}–
                  {String(official + Math.max(secretCount, secretCards.length)).padStart(3, "0")}
                </span>
              </h2>
              <span className="text-xs text-[var(--muted)]">
                {secretOwned}/{secretCount || secretCards.length}{" "}
                {secretOpen ? "▾" : "▸"}
              </span>
            </button>

            {secretOpen &&
              (secretCards.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Keine Secret Rares in den aktuellen Filtern.
                </p>
              ) : view === "grid" ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                  {secretCards.map((card) => (
                    <CardTile
                      key={card.id}
                      card={card}
                      qty={displayQty(card.id)}
                      grayMissing={grayMissing}
                      official={official}
                      selected={
                        card.id === selectedId && (panelOpen || editOpen)
                      }
                      onClick={() => openCard(card.id)}
                    />
                  ))}
                </div>
              ) : (
                <CardList
                  cards={secretCards}
                  getQty={displayQty}
                  official={official}
                  selectedId={panelOpen || editOpen ? selectedId : null}
                  onOpen={openCard}
                />
              ))}
          </section>
        )}
      </div>

      {selected && panelOpen && !editOpen && (
        <SetCardDetailPanel
          card={selected}
          setDetail={setDetail}
          official={official}
          qty={displayQty(selected.id)}
          positionLabel={positionLabel}
          onClose={() => {
            setPanelOpen(false);
            setSelectedId(null);
          }}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={selectedIndex > 0}
          hasNext={
            selectedIndex >= 0 && selectedIndex < orderedNav.length - 1
          }
          onAddToWishlist={() => toggleItem(wishlistItemFromTcg(selected))}
          onEditCollection={() => {
            setPanelOpen(false);
            setEditOpen(true);
          }}
        />
      )}

      {selected && editOpen && (
        <CollectionEditPanel
          card={selected}
          setDetail={setDetail}
          official={official}
          initialCopies={copiesForSelected}
          onClose={() => {
            setEditOpen(false);
            setPanelOpen(true);
          }}
          onSave={(next) => {
            setCopyOverrides((prev) => ({
              ...prev,
              [selected.id]: next,
            }));
          }}
          onSell={() => {
            setEditOpen(false);
            window.location.href = "/portfolio/transaktionen";
          }}
          onRemoveAll={() => {
            setCopyOverrides((prev) => ({
              ...prev,
              [selected.id]: [],
            }));
          }}
        />
      )}
    </>
  );
}

function CardTile({
  card,
  qty,
  grayMissing,
  official,
  selected,
  onClick,
}: {
  card: TcgCard;
  qty: number;
  grayMissing: boolean;
  official: number;
  selected: boolean;
  onClick: () => void;
}) {
  const missing = qty <= 0;
  const num = parseCardNumber(card);
  const label =
    card.collectorId ??
    (num > 0
      ? `${String(num).padStart(3, "0")}/${String(official).padStart(3, "0")}`
      : card.number);
  const price = getCardPrice(card);
  const rarity = formatRarityEnglish(card.rarity);
  const glow = getCardGlowColor(card.types);

  return (
    <div className="min-w-0">
      <div
        data-card-hover
        className={`card-tile-hover group/card relative w-full rounded-xl border bg-[var(--surface)] ${
          selected
            ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
            : "border-[var(--border)] hover:border-[var(--border-strong)]"
        }`}
        style={{ ["--card-glow" as string]: glow }}
      >
        <button type="button" onClick={onClick} className="w-full text-left">
          <div
            className={`relative aspect-[5/7] overflow-visible bg-[var(--surface-elevated)] ${
              missing && grayMissing ? "grayscale opacity-55" : ""
            }`}
          >
            <CardImage
              src={getCardImageUrl(card)}
              alt={card.name}
              fallbacks={getCardImageFallbacks(card)}
              types={card.types}
              hoverGlow
              size="lg"
              className="!aspect-[5/7] !h-full !w-full !rounded-t-xl"
            />
            {!missing && (
              <span className="absolute left-1.5 top-1.5 z-10 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                ×{qty}
              </span>
            )}
          </div>
          <div className="space-y-0.5 p-2.5">
            <p
              className={`truncate text-sm font-medium ${
                missing ? "text-[var(--muted)]" : ""
              }`}
            >
              {missing ? "Fehlt" : card.name}
            </p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {label}
              {rarity ? ` · ${rarity}` : ""}
            </p>
            <div className="flex items-end justify-between gap-1 pt-0.5">
              <span className="tabular-nums text-sm font-semibold">
                {price != null ? formatCurrency(price) : "—"}
              </span>
              {missing ? (
                <span className="text-[11px] text-[var(--muted)]">fehlt</span>
              ) : (
                <span className="tabular-nums text-[11px] font-medium text-[var(--accent)]">
                  ×{qty}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function CardList({
  cards,
  getQty,
  official,
  selectedId,
  onOpen,
}: {
  cards: TcgCard[];
  getQty: (id: string) => number;
  official: number;
  selectedId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {cards.map((card) => {
        const qty = getQty(card.id);
        const num = parseCardNumber(card);
        const label =
          card.collectorId ??
          (num > 0
            ? `${String(num).padStart(3, "0")}/${String(official).padStart(3, "0")}`
            : card.number);
        return (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => onOpen(card.id)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--surface-elevated)]/50 ${
                selectedId === card.id ? "bg-[var(--accent-soft)]" : ""
              }`}
            >
              <div
                className={`h-12 w-9 shrink-0 overflow-hidden rounded ${
                  qty <= 0 ? "grayscale opacity-50" : ""
                }`}
              >
                <CardImage
                  src={getCardImageUrl(card)}
                  alt={card.name}
                  fallbacks={getCardImageFallbacks(card)}
                  size="sm"
                  className="!h-12 !w-9"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {qty <= 0 ? "Fehlt" : card.name}
                </p>
                <p className="font-mono text-xs text-[var(--muted)]">{label}</p>
              </div>
              {qty > 0 ? (
                <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                  ×{qty}
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)]">—</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
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

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" strokeLinecap="round" />
      <path d="M10 21a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}
