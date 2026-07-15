type PanelProps = {
  title: string;
  action?: string;
  children: React.ReactNode;
  className?: string;
};

export function Panel({ title, action, children, className = "" }: PanelProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {action && (
          <button
            type="button"
            className="text-xs text-[var(--accent)] transition-opacity hover:opacity-70"
          >
            {action}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}