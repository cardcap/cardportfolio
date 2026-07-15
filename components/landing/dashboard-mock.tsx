import {
  IconCards,
  IconChart,
  IconHeart,
  IconHome,
  IconImport,
  IconLayers,
  IconSettings,
  IconTrend,
} from "@/components/landing/icons";

const metrics = [
  { label: "Gesamtwert", value: "€ 12.480", change: "+8,4%", positive: true },
  { label: "Investiert", value: "€ 8.760", change: null, positive: true },
  { label: "Gewinn / Verlust", value: "€ 3.720", change: "+18,2%", positive: true },
  { label: "Sammlerstücke", value: "247", change: "+12", positive: true },
];

const recent = [
  { name: "Aurelia, Sternenruferin", set: "Nebulae Chronicles", price: "€ 128,50", change: "+12,3%" },
  { name: "Vortex-Drachen", set: "Sturmfront", price: "€ 89,90", change: "+8,1%" },
  { name: "Chronomant", set: "Zeitklingen", price: "€ 64,20", change: "+5,4%" },
  { name: "Eclipse-Display", set: "Galaxis Erwacht", price: "€ 119,00", change: "+9,7%" },
];

const sets = [
  { name: "Nebulae Chronicles", progress: 92 },
  { name: "Sturmfront", progress: 76 },
  { name: "Zeitklingen", progress: 58 },
];

const nav = [
  { label: "Übersicht", icon: IconHome, active: true },
  { label: "Sammlung", icon: IconLayers, active: false },
  { label: "Portfolio", icon: IconTrend, active: false },
  { label: "Sets", icon: IconCards, active: false },
  { label: "Karten & Produkte", icon: IconCards, active: false },
  { label: "Wunschliste", icon: IconHeart, active: false },
  { label: "Import", icon: IconImport, active: false },
  { label: "Einstellungen", icon: IconSettings, active: false },
];

/** Rough sparkline points for the portfolio chart */
const chartPoints =
  "0,78 18,74 36,72 54,68 72,70 90,62 108,58 126,55 144,48 162,50 180,42 198,38 216,34 234,28 252,30 270,22 288,18 306,14 324,16 342,10 360,8";

export function DashboardMock() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c10]/95 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl"
      aria-hidden
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-pink-500/15 text-pink-300">
            <IconChart className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-medium text-zinc-200">CardCap</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-400">
          Gesamtportfolio
          <span className="text-zinc-500">▾</span>
        </div>
      </div>

      <div className="flex min-h-[280px] sm:min-h-[340px]">
        {/* Sidebar */}
        <aside className="hidden w-[9.5rem] shrink-0 border-r border-white/8 p-2.5 sm:block">
          <nav className="space-y-0.5">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${
                    item.active
                      ? "bg-pink-500/15 text-pink-300"
                      : "text-zinc-500"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
          <h3 className="text-sm font-medium text-zinc-100">Übersicht</h3>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2"
              >
                <p className="text-[9px] uppercase tracking-wide text-zinc-500">
                  {m.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-100 sm:text-base">
                  {m.value}
                </p>
                {m.change && (
                  <p className="text-[10px] tabular-nums text-emerald-400">
                    {m.change}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1.35fr_1fr]">
            {/* Chart */}
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-medium text-zinc-300">
                  Portfolio-Wertentwicklung
                </p>
                <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-zinc-500">
                  1 Jahr
                </span>
              </div>
              <div className="relative h-28 w-full">
                <svg
                  viewBox="0 0 360 90"
                  className="h-full w-full"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(236, 72, 153)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="rgb(236, 72, 153)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,90 L${chartPoints.replace(/ /g, " L")} L360,90 Z`}
                    fill="url(#chartFill)"
                  />
                  <polyline
                    points={chartPoints}
                    fill="none"
                    stroke="rgb(244, 114, 182)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="mt-1 flex justify-between text-[8px] text-zinc-600">
                  {["Dez", "Feb", "Apr", "Jun", "Aug", "Okt", "Nov"].map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent */}
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="mb-2 text-[11px] font-medium text-zinc-300">
                Zuletzt hinzugefügt
              </p>
              <ul className="space-y-2">
                {recent.map((item) => (
                  <li key={item.name} className="flex items-center gap-2">
                    <span className="h-7 w-7 shrink-0 rounded-md bg-gradient-to-br from-pink-500/30 via-violet-500/20 to-indigo-500/30 ring-1 ring-white/10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-medium text-zinc-200">
                        {item.name}
                      </p>
                      <p className="truncate text-[9px] text-zinc-500">{item.set}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium tabular-nums text-zinc-200">
                        {item.price}
                      </p>
                      <p className="text-[9px] tabular-nums text-emerald-400">
                        {item.change}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sets progress */}
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-medium text-zinc-300">Sets</p>
              <span className="text-[9px] text-zinc-500">Alle Sets anzeigen</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {sets.map((set) => (
                <div key={set.name} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 w-5 shrink-0 rounded bg-white/5 ring-1 ring-white/10" />
                    <span className="truncate text-[10px] text-zinc-300">{set.name}</span>
                    <span className="ml-auto text-[10px] tabular-nums text-zinc-500">
                      {set.progress}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-300"
                      style={{ width: `${set.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
