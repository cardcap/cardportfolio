export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="38"
        height="54"
        rx="4"
        className="stroke-[var(--border-strong)]"
        strokeWidth="1.5"
        fill="var(--surface-elevated)"
      />
      <rect
        x="5"
        y="5"
        width="30"
        height="46"
        rx="2"
        fill="var(--accent-soft)"
      />
      <path
        d="M8 38 L14 30 L20 34 L26 22 L32 26"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 42 L14 36 L20 38 L26 28 L32 32"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <circle cx="26" cy="22" r="2" fill="var(--accent)" />
      <circle cx="32" cy="26" r="2" fill="var(--accent)" opacity="0.7" />
    </svg>
  );
}