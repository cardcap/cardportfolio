"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { isAdminRole } from "@/lib/user-roles";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  counts: {
    collectionItems: number;
    sealedItems: number;
    wishlistItems: number;
  };
};

export function UsersAdminView() {
  const { isAuthenticated, isLoading, user } = useAuthMode();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Keine Berechtigung oder Fehler.",
        );
        setUsers([]);
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) void load();
    if (!isLoading && !isAuthenticated) {
      setLoading(false);
      setError("Bitte anmelden.");
    }
  }, [isAuthenticated, isLoading, load]);

  async function setRole(id: string, role: "USER" | "ADMIN") {
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Fehler");
      return;
    }
    setMsg(`Rolle aktualisiert: ${data.data?.email} → ${role}`);
    void load();
  }

  async function removeUser(id: string, email: string) {
    if (!confirm(`Benutzer „${email}“ wirklich löschen? Alle Daten gehen verloren.`)) {
      return;
    }
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Fehler");
      return;
    }
    setMsg(`Gelöscht: ${email}`);
    void load();
  }

  const isAdmin = isAdminRole(user?.role);

  return (
    <div className="pb-8">
      <div className="mb-5">
        <p className="text-xs text-[var(--muted)]">
          <Link href="/einstellungen" className="hover:text-[var(--foreground)]">
            Einstellungen
          </Link>
          <span className="mx-1.5 opacity-50">/</span>
          <span className="text-[var(--foreground)]">Benutzer</span>
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
          Benutzerverwaltung
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Konten, Rollen und Besitz-Übersicht (nur Admins)
        </p>
      </div>

      {!isAdmin && !isLoading && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]">
          Keine Admin-Berechtigung.{" "}
          <Link href="/einstellungen" className="text-[var(--accent)] hover:underline">
            Zurück zu den Einstellungen
          </Link>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-[var(--negative)]/30 bg-[var(--negative-soft)] px-4 py-3 text-sm text-[var(--negative)]">
          {error}
        </p>
      )}
      {msg && (
        <p className="mb-4 rounded-xl border border-[var(--positive)]/30 bg-[var(--positive-soft)] px-4 py-3 text-sm text-[var(--positive)]">
          {msg}
        </p>
      )}

      {isAdmin && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">
              Laden…
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">E-Mail</th>
                    <th className="px-4 py-3 font-medium">Rolle</th>
                    <th className="px-4 py-3 font-medium">Besitz</th>
                    <th className="px-4 py-3 font-medium">Seit</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--surface-elevated)]/40">
                      <td className="px-4 py-3 font-medium">
                        {u.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                            u.role === "ADMIN"
                              ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent)]/30"
                              : "bg-[var(--surface-elevated)] text-[var(--muted)] ring-[var(--border)]"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-[var(--muted)]">
                        {u.counts.collectionItems} Karten · {u.counts.sealedItems}{" "}
                        Sealed · {u.counts.wishlistItems} WL
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)]">
                        {new Date(u.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {u.role !== "ADMIN" ? (
                            <button
                              type="button"
                              onClick={() => void setRole(u.id, "ADMIN")}
                              className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                              → Admin
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void setRole(u.id, "USER")}
                              className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                              → User
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void removeUser(u.id, u.email)}
                            className="rounded-full border border-[var(--negative)]/40 px-2.5 py-1 text-xs text-[var(--negative)] hover:bg-[var(--negative-soft)]"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && !loading && (
                <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                  Keine Benutzer.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
