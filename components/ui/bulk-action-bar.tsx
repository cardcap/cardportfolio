"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BulkActionBarProps = {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  busy?: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  onPurchaseDate: (isoDate: string) => void | Promise<void>;
};

/**
 * Floating multi-select toolbar: select all / clear / purchase date / delete.
 */
export function BulkActionBar({
  selectedCount,
  totalCount,
  allSelected,
  busy = false,
  onSelectAll,
  onClear,
  onDelete,
  onPurchaseDate,
}: BulkActionBarProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [dateValue, setDateValue] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (selectedCount === 0) setDateOpen(false);
  }, [selectedCount]);

  if (selectedCount <= 0) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6"
        role="toolbar"
        aria-label="Auswahl-Aktionen"
      >
        <div className="flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-xl shadow-black/20">
          <p className="px-1 text-sm font-medium tabular-nums">
            {selectedCount.toLocaleString("de-DE")} ausgewählt
          </p>
          <button
            type="button"
            onClick={onSelectAll}
            disabled={busy}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
          >
            {allSelected ? "Keine" : "Alle"} (
            {totalCount.toLocaleString("de-DE")})
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            Aufheben
          </button>
          <Button
            variant="secondary"
            className="!h-9"
            disabled={busy}
            onClick={() => setDateOpen(true)}
          >
            Einkaufsdatum
          </Button>
          <Button
            variant="danger"
            className="!h-9"
            disabled={busy}
            onClick={onDelete}
          >
            {busy ? "…" : "Löschen"}
          </Button>
        </div>
      </div>

      {dateOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-date-title"
          onClick={() => !busy && setDateOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="bulk-date-title"
              className="text-base font-semibold tracking-tight"
            >
              Einkaufsdatum anpassen
            </h2>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              Neues Datum für{" "}
              <strong className="text-[var(--foreground)]">
                {selectedCount.toLocaleString("de-DE")}
              </strong>{" "}
              ausgewählte Einträge.
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block text-[var(--muted)]">
                Einkaufsdatum
              </span>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busy}
                onClick={() => setDateOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1"
                disabled={busy || !dateValue}
                onClick={() => {
                  void (async () => {
                    await onPurchaseDate(dateValue);
                    setDateOpen(false);
                  })();
                }}
              >
                {busy ? "Speichern…" : "Übernehmen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
