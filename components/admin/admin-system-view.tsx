"use client";

import { useEffect, useState } from "react";

export function AdminSystemView() {
  const [raw, setRaw] = useState<string>("Laden…");
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setOk(Boolean(data.ok));
        setRaw(JSON.stringify(data, null, 2));
      } catch (e) {
        setOk(false);
        setRaw(e instanceof Error ? e.message : "Fehler");
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          ok === true
            ? "border-[var(--positive)]/30 bg-[var(--positive-soft)] text-[var(--positive)]"
            : ok === false
              ? "border-[var(--negative)]/30 bg-[var(--negative-soft)] text-[var(--negative)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
        }`}
      >
        {ok === null
          ? "Status wird geprüft…"
          : ok
            ? "System erreichbar · Datenbank OK"
            : "Problem erkannt — Details unten"}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold">GET /api/health</h2>
        <pre className="mt-3 max-h-[28rem] overflow-auto rounded-lg bg-[var(--background)] p-3 text-xs text-[var(--muted)]">
          {raw}
        </pre>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Katalog (Karten/Sets) liegt im Datei-Cache unter <code>data/</code>,
        User-Daten in PostgreSQL (Neon).
      </p>
    </div>
  );
}
