import Link from "next/link";
import { DashboardMock } from "@/components/landing/dashboard-mock";
import { DecorativeCards } from "@/components/landing/decorative-cards";
import {
  IconBox,
  IconFile,
  IconHeart,
  IconLayers,
  IconPuzzle,
  IconSearch,
  IconShield,
  IconTrend,
} from "@/components/landing/icons";
import { LandingShell } from "@/components/landing/landing-shell";

const stripFeatures = [
  {
    title: "Karten & Sealed an einem Ort",
    icon: IconLayers,
  },
  {
    title: "Werte automatisch im Blick",
    icon: IconTrend,
  },
  {
    title: "Kostenlos loslegen",
    icon: IconShield,
  },
];

const featureGrid = [
  {
    title: "Sammlung verwalten",
    description: "Karten & Sealed organisieren",
    icon: IconBox,
  },
  {
    title: "Portfolio tracken",
    description: "Werte & Entwicklung",
    icon: IconTrend,
  },
  {
    title: "Sets vervollständigen",
    description: "Fortschritt & Checklisten",
    icon: IconPuzzle,
  },
  {
    title: "Karten- & Produktdatenbank",
    description: "Suchen & entdecken",
    icon: IconSearch,
  },
  {
    title: "Wunschliste",
    description: "Behalten, was du willst",
    icon: IconHeart,
  },
  {
    title: "Excel-Import",
    description: "Schnell & unkompliziert",
    icon: IconFile,
  },
];

export default function Home() {
  return (
    <LandingShell>
      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-8 sm:pt-10 lg:pb-16 lg:pt-12">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-10">
            <div className="relative z-10 max-w-xl">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-300/90">
                Dein TCG-Portfolio
              </p>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                Deine Sammlung.
                <br />
                Dein Wert.
                <br />
                <span className="bg-gradient-to-r from-pink-300 via-pink-400 to-pink-300 bg-clip-text text-transparent">
                  Alles im Blick.
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg">
                Verwalte Karten &amp; Sealed Produkte, verfolge ihre
                Wertentwicklung und vervollständige deine Sets – an einem Ort.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-pink-400 px-7 text-sm font-semibold text-zinc-950 transition-all hover:bg-pink-300 hover:shadow-[0_0_0_6px_rgba(244,114,182,0.18)]"
                >
                  Kostenlos starten
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/0 px-7 text-sm font-medium text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/5"
                >
                  Demo ansehen
                </Link>
              </div>

              <p className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
                <IconShield className="h-3.5 w-3.5 text-zinc-500" />
                Kostenlos starten · Keine Kreditkarte nötig
              </p>
            </div>

            <div className="relative">
              <DecorativeCards />
              <div className="relative z-10 scale-[0.98] sm:scale-100">
                <DashboardMock />
              </div>
            </div>
          </div>
        </section>

        {/* Feature strip */}
        <section className="border-y border-white/8 bg-black/30">
          <div className="mx-auto grid max-w-6xl divide-y divide-white/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stripFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center justify-center gap-3 px-5 py-5 text-center sm:py-6"
                >
                  <Icon className="h-5 w-5 shrink-0 text-pink-300" />
                  <span className="text-sm font-medium text-zinc-300">
                    {item.title}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="funktionen"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
        >
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Alles, was{" "}
            <span className="text-pink-300">deine Sammlung</span> braucht
          </h2>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureGrid.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition-colors hover:border-pink-400/25 hover:bg-pink-500/[0.04]"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-pink-300 transition-colors group-hover:border-pink-400/30 group-hover:bg-pink-500/10">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-medium text-zinc-100">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pricing teaser (nav anchor) */}
        <section
          id="preise"
          className="border-t border-white/8 bg-gradient-to-b from-transparent to-pink-500/[0.04] px-5 py-16 sm:px-8 sm:py-20"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Starte kostenlos
            </h2>
            <p className="mt-3 text-zinc-400">
              Keine Kreditkarte. Kein Abo-Zwang. Einfach registrieren und deine
              Sammlung aufbauen.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-pink-400 px-8 text-sm font-semibold text-zinc-950 transition-all hover:bg-pink-300 hover:shadow-[0_0_0_6px_rgba(244,114,182,0.18)]"
            >
              Kostenlos starten
            </Link>
          </div>
        </section>
      </main>
    </LandingShell>
  );
}
