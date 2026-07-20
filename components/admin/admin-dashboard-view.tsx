"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  database?: {
    type?: string;
    status?: string;
    counts?: {
      users?: number;
      collectionItems?: number;
      sealedItems?: number;
    };
  };
};

type AdminUser = {
  id: string;
  role: string;
  counts: {
    collectionItems: number;
    sealedItems: number;
    wishlistItems: number;
  };
};

export function AdminDashboardView() {
  const [health, setHealth] = useState<Health | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [hRes, uRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/admin/users"),
        ]);
        const h = hRes.ok ? ((await hRes.json()) as Health) : null;
        const u = uRes.ok ? await uRes.json() : { users: [] };
        if (cancelled) return;
        setHealth(h);
        setUsers(u.users ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const userCount = users.length;
  const totalCards = users.reduce((s, u) => s + u.counts.collectionItems, 0);
  const totalSealed = users.reduce((s, u) => s + u.counts.sealedItems, 0);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Laden…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Benutzer gesamt" value={String(userCount)} />
        <StatCard label="Admins" value={String(adminCount)} />
        <StatCard label="Karten (alle User)" value={String(totalCards)} />
        <StatCard label="Sealed (alle User)" value={String(totalSealed)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold">Datenbank</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row
              k="Status"
              v={
                health?.database?.status === "ok" ? (
                  <span className="text-[var(--positive)]">OK</span>
                ) : (
                  <span className="text-[var(--negative)]">
                    {health?.database?.status ?? "unbekannt"}
                  </span>
                )
              }
            />
            <Row k="Typ" v={health?.database?.type ?? "—"} />
            <Row
              k="User (DB)"
              v={String(health?.database?.counts?.users ?? "—")}
            />
            <Row
              k="Collection-Items"
              v={String(health?.database?.counts?.collectionItems ?? "—")}
            />
            <Row
              k="Sealed-Items"
              v={String(health?.database?.counts?.sealedItems ?? "—")}
            />
          </dl>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold">Schnellzugriff</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link
                href="/admin/benutzer"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Benutzer verwalten →
              </Link>
              <p className="text-xs text-[var(--muted)]">
                Rollen, Löschen, Besitz-Übersicht
              </p>
            </li>
            <li>
              <Link
                href="/admin/system"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                System-Status →
              </Link>
              <p className="text-xs text-[var(--muted)]">
                Health-Check und technische Infos
              </p>
            </li>
            <li>
              <Link
                href="/einstellungen"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Einstellungen →
              </Link>
              <p className="text-xs text-[var(--muted)]">
                Eigenes Profil und Passwort
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 tabular-nums text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}
