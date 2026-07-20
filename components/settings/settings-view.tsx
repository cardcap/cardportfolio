"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAuthMode } from "@/components/auth/use-auth-mode";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { isAdminRole } from "@/lib/user-roles";

const fieldClass =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]";

type SectionId =
  | "allgemein"
  | "sammlung"
  | "benachrichtigungen"
  | "daten"
  | "sicherheit";

const sections: { id: SectionId; label: string; desc: string }[] = [
  {
    id: "allgemein",
    label: "Allgemein",
    desc: "Profil, Sprache, Darstellung",
  },
  {
    id: "sammlung",
    label: "Sammlung & Portfolio",
    desc: "Standards und Wunschliste",
  },
  {
    id: "benachrichtigungen",
    label: "Benachrichtigungen",
    desc: "Preise und Kanäle",
  },
  {
    id: "daten",
    label: "Daten & Import",
    desc: "Excel, Export, Löschen",
  },
  {
    id: "sicherheit",
    label: "Sicherheit",
    desc: "Passwort und Konto",
  },
];

export function SettingsView() {
  const { isAuthenticated, isDemo, user } = useAuthMode();
  const { update: updateSession } = useSession();
  const [section, setSection] = useState<SectionId>("allgemein");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("USER");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Demo local settings state
  const [language, setLanguage] = useState("de");
  const [currency, setCurrency] = useState("EUR");
  const [dateFormat, setDateFormat] = useState("de-DE");
  const [pageSize, setPageSize] = useState("24");
  const [defaultCondition, setDefaultCondition] = useState("NM");
  const [defaultAssetView, setDefaultAssetView] = useState("list");
  const [autoRemoveWishlist, setAutoRemoveWishlist] = useState(true);
  const [notifyTarget, setNotifyTarget] = useState(true);
  const [notifyChange, setNotifyChange] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setDisplayName(user?.name ?? "Demo");
      setEmail(user?.email ?? "");
      setRole("USER");
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    void (async () => {
      try {
        const res = await fetch("/api/user/me");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setDisplayName(data.name ?? "");
        setEmail(data.email ?? "");
        setRole(data.role ?? "USER");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.name, user?.email]);

  function flashSaved() {
    setSaved(true);
    setError(null);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveProfile() {
    setError(null);
    if (!isAuthenticated) {
      flashSaved();
      return;
    }
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Speichern fehlgeschlagen",
        );
        return;
      }
      await updateSession?.({ name: data.name });
      flashSaved();
    } catch {
      setError("Netzwerkfehler");
    }
  }

  async function changePassword() {
    setError(null);
    if (!isAuthenticated) {
      setError("Bitte anmelden, um das Passwort zu ändern.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Neue Passwörter stimmen nicht überein.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mindestens 8 Zeichen.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Passwort ändern fehlgeschlagen",
        );
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      flashSaved();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="pb-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Einstellungen
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Konto, Darstellung und Sammlung verwalten
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs font-medium text-[var(--positive)]">
              Gespeichert
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[14rem_1fr]">
        <nav className="space-y-1 lg:sticky lg:top-4 lg:self-start">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors ${
                section === s.id
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30"
                  : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="text-sm font-medium">{s.label}</span>
              <span className="text-[11px] opacity-80">{s.desc}</span>
            </button>
          ))}
        </nav>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          {section === "allgemein" && (
            <Section title="Allgemein">
              {isDemo && (
                <p className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--muted)]">
                  Demo-Modus — Profil wird lokal angezeigt.{" "}
                  <Link href="/login" className="text-[var(--accent)] hover:underline">
                    Anmelden
                  </Link>{" "}
                  für Speicherung in der Datenbank.
                </p>
              )}
              {isAdminRole(role) && (
                <p className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent)]">
                  Admin-Konto ·{" "}
                  <Link href="/admin/benutzer" className="font-medium underline">
                    Benutzerverwaltung öffnen
                  </Link>
                </p>
              )}
              <Field label="Profil">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={fieldClass}
                  placeholder="Anzeigename"
                  disabled={loadingProfile}
                />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className={`${fieldClass} mt-2 opacity-80`}
                  placeholder="E-Mail"
                />
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  E-Mail ist die Login-Kennung und kann hier nicht geändert werden.
                </p>
              </Field>
              <Field label="Sprache">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={fieldClass}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="Währung">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={fieldClass}
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">US-Dollar ($)</option>
                  <option value="GBP">Pfund (£)</option>
                </select>
              </Field>
              <Field label="Datumsformat">
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className={fieldClass}
                >
                  <option value="de-DE">TT.MM.JJJJ</option>
                  <option value="en-GB">DD/MM/YYYY</option>
                  <option value="en-US">MM/DD/YYYY</option>
                </select>
              </Field>
              <Field label="Hell / Dunkel">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-[var(--muted)]">
                    Theme umschalten
                  </p>
                  <ThemeToggleButton className="!h-9 !w-9" />
                </div>
              </Field>
              <Field label="Einträge pro Tabelle">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value)}
                  className={fieldClass}
                >
                  <option value="12">12</option>
                  <option value="24">24</option>
                  <option value="48">48</option>
                  <option value="96">96</option>
                </select>
              </Field>
              {error && section === "allgemein" && (
                <p className="text-sm text-[var(--negative)]">{error}</p>
              )}
              <SaveButton onClick={() => void saveProfile()} />
            </Section>
          )}

          {section === "sammlung" && (
            <Section title="Sammlung & Portfolio">
              <Field label="Standardzustand beim Hinzufügen">
                <select
                  value={defaultCondition}
                  onChange={(e) => setDefaultCondition(e.target.value)}
                  className={fieldClass}
                >
                  <option value="M">Mint (M)</option>
                  <option value="NM">Near Mint (NM)</option>
                  <option value="EX">Excellent (EX)</option>
                  <option value="GD">Good (GD)</option>
                  <option value="LP">Light Played (LP)</option>
                  <option value="PL">Played (PL)</option>
                  <option value="PO">Poor (PO)</option>
                  <option value="OVP">OVP / Sealed</option>
                </select>
              </Field>
              <Field label="Standardansicht für Assets">
                <select
                  value={defaultAssetView}
                  onChange={(e) => setDefaultAssetView(e.target.value)}
                  className={fieldClass}
                >
                  <option value="list">Liste</option>
                  <option value="grid">Kacheln</option>
                </select>
              </Field>
              <Toggle
                label="Wunschlistenartikel nach Hinzufügen automatisch entfernen"
                checked={autoRemoveWishlist}
                onChange={setAutoRemoveWishlist}
              />
              <SaveButton onClick={flashSaved} />
            </Section>
          )}

          {section === "benachrichtigungen" && (
            <Section title="Benachrichtigungen">
              <Toggle
                label="Preisziel erreicht"
                checked={notifyTarget}
                onChange={setNotifyTarget}
              />
              <Toggle
                label="Starke Preisänderung"
                checked={notifyChange}
                onChange={setNotifyChange}
              />
              <Toggle
                label="In-App-Benachrichtigungen"
                checked={notifyInApp}
                onChange={setNotifyInApp}
              />
              <Toggle
                label="E-Mail-Benachrichtigungen"
                checked={notifyEmail}
                onChange={setNotifyEmail}
              />
              <SaveButton onClick={flashSaved} />
            </Section>
          )}

          {section === "daten" && (
            <Section title="Daten & Import">
              <ActionRow
                title="Excel-Import"
                desc="Sammlung oder Portfolio per Excel/CSV importieren"
                action="Import starten"
                href="/assets/karten"
              />
              <ActionRow
                title="Importverlauf"
                desc="Letzte Importe und Status ansehen (Demo)"
                action="Anzeigen"
              />
              <ActionRow
                title="Sammlung exportieren"
                desc="Aktuelle Sammlung als Excel herunterladen"
                action="Exportieren"
              />
              <ActionRow
                title="Daten löschen"
                desc="Lokale Demo-Daten und Caches zurücksetzen"
                action="Löschen"
                danger
              />
            </Section>
          )}

          {section === "sicherheit" && (
            <Section title="Sicherheit">
              <Field label="Aktuelles Passwort">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={fieldClass}
                  autoComplete="current-password"
                  disabled={!isAuthenticated}
                />
              </Field>
              <Field label="Neues Passwort">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldClass}
                  autoComplete="new-password"
                  disabled={!isAuthenticated}
                  placeholder="Mind. 8 Zeichen"
                />
              </Field>
              <Field label="Neues Passwort bestätigen">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                  autoComplete="new-password"
                  disabled={!isAuthenticated}
                />
              </Field>
              {error && section === "sicherheit" && (
                <p className="text-sm text-[var(--negative)]">{error}</p>
              )}
              <SaveButton
                onClick={() => void changePassword()}
                label={pwSaving ? "Wird gespeichert…" : "Passwort ändern"}
              />
              <p className="text-xs text-[var(--muted)]">
                2FA und Sitzungsverwaltung folgen in einem späteren Schritt.
              </p>
            </Section>
          )}
        </div>
      </div>

    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function ActionRow({
  title,
  desc,
  action,
  href,
  danger,
}: {
  title: string;
  desc: string;
  action: string;
  href?: string;
  danger?: boolean;
}) {
  const btn = (
    <span
      className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium ${
        danger
          ? "border border-red-400/40 text-red-300 hover:bg-red-500/10"
          : "bg-[var(--accent-soft)] text-[var(--accent)] hover:brightness-110"
      }`}
    >
      {action}
    </span>
  );
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-[var(--muted)]">{desc}</p>
      </div>
      {href ? (
        <a href={href}>{btn}</a>
      ) : (
        <button type="button">{btn}</button>
      )}
    </div>
  );
}

function SaveButton({
  onClick,
  label = "Speichern",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-white hover:brightness-110"
    >
      {label}
    </button>
  );
}
