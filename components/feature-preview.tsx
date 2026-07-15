const metrics = [
  { label: "Portfolio-Wert", value: "€ 12.480", change: "+8,4%" },
  { label: "Karten", value: "247", change: "+12" },
  { label: "Gewinn / Verlust", value: "€ 1.920", change: "+18,2%" },
];

const features = [
  { title: "Sammlung", description: "Alle Karten an einem Ort" },
  { title: "Marktanalyse", description: "Preise & Trends im Blick" },
  { title: "Portfolio", description: "Wertentwicklung verfolgen" },
];

export function FeaturePreview() {
  return (
    <div
      className="w-full max-w-4xl rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-1"
      style={{ boxShadow: "var(--preview-shadow)" }}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className="mx-auto rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-1 text-xs text-[var(--muted)]">
          cardportfolio.de/app
        </div>
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 sm:px-4 sm:py-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] sm:text-[11px]">
                {metric.label}
              </p>
              <p className="tabular-nums mt-1 text-base font-medium tracking-tight sm:text-lg">
                {metric.value}
              </p>
              <p className="tabular-nums mt-0.5 text-xs text-[var(--accent)]">
                {metric.change}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--accent-soft)] px-3 py-4 sm:px-4 sm:py-5"
            >
              <div className="mb-3 h-1.5 w-8 rounded-full bg-[var(--accent)] opacity-70" />
              <p className="text-sm font-medium">{feature.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {feature.description}
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--accent)]">
                Vorschau
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4 sm:py-5">
          <div className="flex h-14 items-end gap-1 sm:h-20 sm:gap-1.5">
            {[38, 52, 44, 68, 58, 74, 62, 82, 70, 88, 76, 92].map(
              (height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-sm bg-[var(--accent)] opacity-80"
                  style={{ height: `${Math.round(height * 0.65)}px` }}
                />
              ),
            )}
          </div>
          <p className="mt-3 text-center text-[11px] text-[var(--muted)]">
            Wertentwicklung — Platzhalter
          </p>
        </div>
      </div>
    </div>
  );
}