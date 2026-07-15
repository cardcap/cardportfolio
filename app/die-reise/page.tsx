import type { Metadata } from "next";
import Link from "next/link";
import { LandingShell } from "@/components/landing/landing-shell";
import { BRAND_NAME } from "@/lib/landing-nav";

export const metadata: Metadata = {
  title: `Die Reise hat erst begonnen — ${BRAND_NAME}`,
  description:
    "Was bei CardCap als Nächstes kommt — Features, Vision und Community.",
};

const available = [
  "Sammlung verwalten",
  "Portfolio verfolgen",
  "Dashboard mit Kennzahlen",
  "Set-Tracking",
  "Kartendatenbank",
  "Unterstützung mehrerer Kartensprachen",
];

const inProgress = [
  "Excel-Import für bestehende Sammlungen",
  "Wunschliste",
  "Erweiterte Filter- und Suchfunktionen",
  "Verbesserte Sammlungsstatistiken",
];

const visionPoints = [
  "Mehr Übersicht.",
  "Mehr Fortschritt.",
  "Mehr Transparenz.",
  "Mehr Sammelspaß.",
];

export default function DieReisePage() {
  return (
    <LandingShell>
      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
          Was kommt als Nächstes?
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Die Reise hat erst begonnen
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Wir stehen noch am Anfang.
        </p>

        <div className="mt-8 space-y-4 text-base leading-relaxed text-[var(--foreground)]">
          <p>
            <strong>{BRAND_NAME}</strong> entwickelt sich kontinuierlich weiter
            – mit einem klaren Ziel:
          </p>
          <p className="text-lg font-medium">
            Die beste Plattform für Pokémon-Sammler zu schaffen.
          </p>
          <p className="text-[var(--muted)]">
            Dabei konzentrieren wir uns auf Funktionen, die Sammlern wirklich
            helfen und den Überblick über ihre Sammlung einfacher machen.
          </p>
        </div>

        <section className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Bereits verfügbar</h2>
          <ul className="mt-4 space-y-2.5">
            {available.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 text-[var(--positive)]" aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)]/50 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Aktuell in Arbeit</h2>
          <ul className="mt-4 space-y-2.5">
            {inProgress.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0" aria-hidden>
                  🚧
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Unsere Vision
          </h2>
          <p className="mt-4 leading-relaxed text-[var(--muted)]">
            Wir möchten einen Ort schaffen, an dem Sammler alles finden, was sie
            für ihre Sammlung benötigen.
          </p>
          <ul className="mt-6 space-y-2">
            {visionPoints.map((point) => (
              <li
                key={point}
                className="text-lg font-medium text-[var(--accent)]"
              >
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Gemeinsam mit der Community</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            <p>
              Die besten Ideen entstehen oft direkt aus der Community. Deshalb
              fließt das Feedback unserer Nutzer aktiv in die Weiterentwicklung
              von {BRAND_NAME} ein.
            </p>
            <p>
              Jede neue Funktion soll einen echten Mehrwert bieten und das
              Sammeln einfacher und übersichtlicher machen.
            </p>
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--border)] pt-12">
          <p className="text-lg font-medium">
            Die Reise hat gerade erst begonnen.
          </p>
          <p className="mt-4 leading-relaxed text-[var(--muted)]">
            Heute hilft dir {BRAND_NAME} dabei, deine Sammlung zu verwalten,
            ihren Wert zu verfolgen und deinen Set-Fortschritt sichtbar zu
            machen.
          </p>
          <p className="mt-4 text-lg font-medium text-[var(--foreground)]">
            Und das ist erst der Anfang.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-7 text-sm font-medium text-white transition-all hover:brightness-110 hover:shadow-[0_0_0_6px_var(--accent-soft)]"
          >
            Kostenlos starten
          </Link>
        </section>
      </article>
    </LandingShell>
  );
}