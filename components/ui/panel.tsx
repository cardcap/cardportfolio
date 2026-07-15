import Link from "next/link";

type PanelProps = {
  title: string;
  /** Plain action label (non-link button look) */
  action?: string;
  /** Link for action — preferred over action alone */
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
};

export function Panel({
  title,
  action,
  actionHref,
  actionLabel,
  children,
  className = "",
}: PanelProps) {
  const label = actionLabel ?? action;

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {label &&
          (actionHref ? (
            <Link
              href={actionHref}
              className="shrink-0 text-xs font-medium text-[var(--accent)] transition-opacity hover:opacity-70"
            >
              {label}
            </Link>
          ) : (
            <span className="shrink-0 text-xs text-[var(--accent)]">{label}</span>
          ))}
      </div>
      {children}
    </div>
  );
}
