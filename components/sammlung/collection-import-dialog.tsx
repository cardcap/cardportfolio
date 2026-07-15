"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type ImportPreviewRow = {
  rowIndex: number;
  name: string;
  set: string;
  number: string;
  language: string;
  quantity: number;
  condition: string;
  purchasePrice: number | null;
  purchaseDate: string;
  tcgCardId: string;
  status: "matched" | "uncertain" | "not_found";
  confidence: string;
  matchedName?: string;
  matchedSet?: string;
  matchedNumber?: string;
  imageUrl?: string;
  include: boolean;
  candidates: Array<{
    tcgCardId: string;
    name: string;
    setName: string;
    number: string;
  }>;
};

type ImportPreview = {
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    matched: number;
    uncertain: number;
    notFound: number;
  };
};

type CollectionImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const STATUS_LABELS = {
  matched: "Gefunden",
  uncertain: "Unsicher",
  not_found: "Nicht gefunden",
} as const;

export function CollectionImportDialog({
  open,
  onClose,
  onImported,
}: CollectionImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);

  const reset = useCallback(() => {
    setUrl("");
    setError(null);
    setPreview(null);
    setRows([]);
    setDragOver(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const runPreview = async (file?: File, link?: string) => {
    setLoading(true);
    setError(null);

    try {
      let res: Response;

      if (file) {
        const form = new FormData();
        form.append("file", file);
        res = await fetch("/api/collection/import/preview", {
          method: "POST",
          body: form,
        });
      } else if (link?.trim()) {
        res = await fetch("/api/collection/import/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link.trim() }),
        });
      } else {
        throw new Error("Bitte Datei oder Link angeben.");
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Vorschau fehlgeschlagen.");
      }

      setPreview(data as ImportPreview);
      setRows(data.rows as ImportPreviewRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorschau fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void runPreview(file);
  };

  const handleConfirm = async () => {
    const payload = rows
      .filter((row) => row.include && row.tcgCardId)
      .map((row) => ({
        tcgCardId: row.tcgCardId!,
        quantity: row.quantity,
        condition: row.condition,
        purchasePrice: row.purchasePrice,
        purchaseDate: row.purchaseDate || null,
        language: row.language,
      }));

    if (payload.length === 0) {
      setError("Keine Zeilen zum Import ausgewählt.");
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/collection/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Import fehlgeschlagen.");
      }

      onImported();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import fehlgeschlagen.");
    } finally {
      setConfirming(false);
    }
  };

  const toggleRow = (rowIndex: number, include: boolean) => {
    setRows((current) =>
      current.map((row) =>
        row.rowIndex === rowIndex ? { ...row, include } : row,
      ),
    );
  };

  const pickCandidate = (rowIndex: number, tcgCardId: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        const candidate = row.candidates.find((c) => c.tcgCardId === tcgCardId);
        if (!candidate) return row;
        return {
          ...row,
          tcgCardId: candidate.tcgCardId,
          matchedName: candidate.name,
          matchedSet: candidate.setName,
          matchedNumber: candidate.number,
          status: "matched",
          include: true,
        };
      }),
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[min(92dvh,100%)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--background)] shadow-xl sm:max-h-[90vh] sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Sammlung importieren</h2>
            <p className="text-sm text-[var(--muted)]">
              Excel, CSV oder öffentlicher Google-Sheets-Link
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {!preview ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragOver
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <p className="font-medium">Datei hierher ziehen</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  oder klicken · .xlsx, .xls, .csv
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-[var(--muted)]">
                  Oder Link (z. B. Google Sheets)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
                  />
                  <Button
                    variant="secondary"
                    disabled={loading || !url.trim()}
                    onClick={() => void runPreview(undefined, url)}
                  >
                    Laden
                  </Button>
                </div>
              </div>

              <a
                href="/api/collection/import/template"
                download
                className="inline-block text-sm text-[var(--accent)] hover:opacity-80"
              >
                Vorlage herunterladen (.csv)
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm">
                <span>
                  <strong>{preview.summary.total}</strong> Zeilen
                </span>
                <span className="text-[var(--positive)]">
                  {preview.summary.matched} gefunden
                </span>
                <span className="text-[var(--warning)]">
                  {preview.summary.uncertain} unsicher
                </span>
                <span className="text-[var(--negative)]">
                  {preview.summary.notFound} nicht gefunden
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                      <th className="px-3 py-2">Import</th>
                      <th className="px-3 py-2">Eingabe</th>
                      <th className="px-3 py-2">Treffer</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={row.include && !!row.tcgCardId}
                            disabled={!row.tcgCardId}
                            onChange={(e) =>
                              toggleRow(row.rowIndex, e.target.checked)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium">
                            {row.name || row.tcgCardId || "—"}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {[row.set, row.number].filter(Boolean).join(" · ")}
                            {row.quantity > 1 ? ` · ×${row.quantity}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          {row.tcgCardId ? (
                            <div>
                              <p>{row.matchedName}</p>
                              <p className="text-xs text-[var(--muted)]">
                                {row.matchedSet} · {row.matchedNumber}
                              </p>
                            </div>
                          ) : row.candidates.length > 0 ? (
                            <select
                              className="h-8 w-full max-w-[220px] rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"
                              defaultValue=""
                              onChange={(e) =>
                                pickCandidate(row.rowIndex, e.target.value)
                              }
                            >
                              <option value="" disabled>
                                Karte wählen…
                              </option>
                              {row.candidates.map((candidate) => (
                                <option
                                  key={candidate.tcgCardId}
                                  value={candidate.tcgCardId}
                                >
                                  {candidate.name} ({candidate.setName} #
                                  {candidate.number})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs font-medium ${
                              row.status === "matched"
                                ? "text-[var(--positive)]"
                                : row.status === "uncertain"
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--negative)]"
                            }`}
                          >
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={reset}
                className="text-sm text-[var(--accent)] hover:opacity-80"
              >
                Andere Datei wählen
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-[var(--negative)] bg-[var(--negative-soft)] px-3 py-2 text-sm text-[var(--negative)]">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <Button variant="secondary" onClick={handleClose}>
            Abbrechen
          </Button>
          {preview && (
            <Button
              disabled={confirming || loading}
              onClick={() => void handleConfirm()}
            >
              {confirming ? "Importiere…" : "Import bestätigen"}
            </Button>
          )}
          {loading && !preview && (
            <span className="self-center text-sm text-[var(--muted)]">
              Analysiere…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}