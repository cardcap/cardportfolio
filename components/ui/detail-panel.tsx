type DetailPanelProps = {
  onClose: () => void;
  children: React.ReactNode;
};

export function DetailPanel({ onClose, children }: DetailPanelProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Detailansicht schließen"
        className="pointer-events-none fixed inset-0 z-40 bg-black/20 lg:bg-transparent"
        onClick={onClose}
      />
      <aside
        className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 flex max-h-[min(72dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:inset-x-auto lg:top-24 lg:right-6 lg:bottom-6 lg:w-80 lg:max-h-[calc(100dvh-7.5rem)] lg:rounded-xl lg:border lg:shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <p className="text-sm font-medium lg:hidden">Details</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="detail-panel-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4">
          {children}
        </div>
      </aside>
    </>
  );
}