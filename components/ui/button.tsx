type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
};

const variants = {
  primary:
    "bg-[var(--accent)] text-white hover:brightness-110",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)]",
  danger:
    "border border-[var(--negative)] text-[var(--negative)] hover:bg-[var(--negative-soft)]",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-10 min-h-10 touch-manipulation items-center justify-center rounded-lg px-4 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}