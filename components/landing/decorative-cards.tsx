/** Floating sealed products / cards behind the dashboard mock */
export function DecorativeCards() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Left gold card */}
      <div className="absolute -left-6 top-[18%] hidden w-28 -rotate-12 sm:block lg:-left-10 lg:w-36">
        <div className="aspect-[5/7] rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-900/40 via-zinc-900 to-zinc-950 p-2 shadow-2xl shadow-black/60">
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-amber-400/20 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.15),transparent_60%)]">
            <div className="h-10 w-10 rounded-full border border-amber-400/40 bg-amber-500/10" />
            <div className="mt-3 h-1 w-10 rounded bg-amber-400/30" />
            <div className="mt-1.5 h-1 w-7 rounded bg-amber-400/20" />
          </div>
        </div>
      </div>

      {/* Right product stack */}
      <div className="absolute -right-4 bottom-[8%] hidden w-32 rotate-6 sm:block lg:-right-2 lg:bottom-[12%] lg:w-40">
        <div className="relative">
          <div className="absolute -left-3 -top-4 h-28 w-20 rotate-[-8deg] rounded-lg border border-indigo-400/30 bg-gradient-to-br from-indigo-900/80 to-zinc-950 shadow-xl" />
          <div className="absolute -right-2 top-2 h-24 w-16 rotate-[10deg] rounded-lg border border-violet-400/30 bg-gradient-to-br from-violet-900/70 to-zinc-950 shadow-xl" />
          <div className="relative aspect-square rounded-xl border border-pink-400/25 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-3 shadow-2xl">
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-white/5 bg-[radial-gradient(circle_at_50%_30%,rgba(244,114,182,0.2),transparent_55%)]">
              <div className="grid grid-cols-2 gap-1">
                <span className="h-6 w-5 rounded-sm bg-white/10" />
                <span className="h-6 w-5 rounded-sm bg-white/10" />
                <span className="h-6 w-5 rounded-sm bg-white/10" />
                <span className="h-6 w-5 rounded-sm bg-white/10" />
              </div>
              <p className="mt-2 text-[8px] font-semibold tracking-widest text-pink-300/80">
                ECLIPSE
              </p>
            </div>
          </div>
          {/* Cube */}
          <div className="absolute -bottom-6 -right-4 h-14 w-14 rotate-12 rounded-lg border border-violet-300/20 bg-gradient-to-br from-violet-800/50 to-zinc-950 shadow-lg" />
        </div>
      </div>
    </div>
  );
}
