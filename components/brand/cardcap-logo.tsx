type LogoProps = {
  className?: string;
  /** Accessible label; decorative if omitted and aria-hidden */
  title?: string;
};

const PINK = "#E48D98";

/**
 * Full CardCap wordmark (icon + text) from cardcaplogo.svg.
 * Stroke/text use currentColor so light/dark themes stay readable.
 */
export function CardCapLogo({ className = "h-8 w-auto", title }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 280"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {/* Icon */}
      <g transform="translate(30, 30)">
        <path
          d="M18 175 Q18 198 42 198 L148 198 L148 105 L120 60 L88 115 L52 70 L18 135 Z"
          fill={PINK}
        />
        <path
          d="M18 135 L18 28 Q18 6 40 6 L162 6 Q184 6 184 28 L184 148"
          fill="none"
          stroke="currentColor"
          strokeWidth="13.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 150 L52 70 L88 115 L135 35 L165 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="13.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M148 2 L165 15 L152 35"
          fill="none"
          stroke="currentColor"
          strokeWidth="13.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Wordmark */}
      <text
        x="255"
        y="185"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="130"
        letterSpacing="-2.5"
      >
        <tspan fill="currentColor">Card</tspan>
        <tspan fill={PINK}>Cap</tspan>
      </text>
    </svg>
  );
}

/**
 * Icon-only mark (chart card) for compact UI slots.
 */
export function CardCapMark({ className = "h-8 w-8", title }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <g transform="translate(8, 8)">
        <path
          d="M18 175 Q18 198 42 198 L148 198 L148 105 L120 60 L88 115 L52 70 L18 135 Z"
          fill={PINK}
        />
        <path
          d="M18 135 L18 28 Q18 6 40 6 L162 6 Q184 6 184 28 L184 148"
          fill="none"
          stroke="currentColor"
          strokeWidth="13.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 150 L52 70 L88 115 L135 35 L165 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="13.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M148 2 L165 15 L152 35"
          fill="none"
          stroke="currentColor"
          strokeWidth="13.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
