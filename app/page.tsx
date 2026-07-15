import Image from "next/image";
import Link from "next/link";
import { FeaturePreview } from "@/components/feature-preview";
import { LandingShell } from "@/components/landing/landing-shell";
import { cards } from "@/lib/mock-data";
import { landingNav } from "@/lib/landing-nav";

const features = [
  {
    title: "Portfolio im Blick",
    description: "Wertentwicklung deiner Sammlung verfolgen.",
  },
  {
    title: "Sets vervollständigen",
    description: "Fortschritt pro Set auf einen Blick.",
  },
  {
    title: "Kartendatenbank",
    description: "Tausende Karten durchsuchen und vergleichen.",
  },
];

export default function Home() {
  return (
    <LandingShell>
      <main>
        <div className="relative mx-auto flex min-h-[calc(100dvh-8rem)] max-w-6xl flex-col justify-center px-5 py-12 sm:px-8 lg:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">
                TCG Portfolio
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Deine Karten.
                <br />
                <span className="text-[var(--accent)]">Dein Überblick.</span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--muted)] sm:text-lg">
                Sammlung verwalten, Werte tracken, Sets vervollständigen — alles
                an einem Ort.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-7 text-sm font-medium text-white transition-all hover:brightness-110 hover:shadow-[0_0_0_6px_var(--accent-soft)]"
                >
                  Jetzt dein Portfolio erstellen
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border-strong)] px-7 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
                >
                  Demo ansehen
                </Link>
              </div>
            </div>

            <div className="relative">
              <FeaturePreview />
              <div className="pointer-events-none absolute -right-4 -top-6 hidden w-24 rotate-6 sm:block lg:-right-8 lg:-top-10 lg:w-28">
                <Image
                  src={cards["pikachu-promo"].imageUrl}
                  alt="Pikachu"
                  width={112}
                  height={156}
                  className="h-auto w-28 rounded-lg shadow-xl"
                />
              </div>
              <div className="pointer-events-none absolute -bottom-6 -left-4 hidden w-28 -rotate-6 sm:block lg:-bottom-10 lg:-left-8 lg:w-32">
                <Image
                  src={cards["charizard-ex"].imageUrl}
                  alt="Glurak ex"
                  width={128}
                  height={179}
                  className="h-auto w-32 rounded-lg shadow-xl"
                />
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-5 backdrop-blur-sm"
              >
                <div className="mb-3 h-1 w-8 rounded-full bg-[var(--accent)] opacity-70" />
                <h2 className="text-sm font-medium">{feature.title}</h2>
                <p className="mt-1.5 text-sm text-[var(--muted)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {landingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3 text-sm transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                <span className="font-medium">{item.label}</span>
                {item.description && (
                  <span className="text-[var(--muted)]">· {item.description}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </LandingShell>
  );
}