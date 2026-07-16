"use client";

import { useState, type CSSProperties } from "react";
import { getCardGlowColor } from "@/lib/card-colors";

type CardImageProps = {
  src: string;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  fallbacks?: string[];
  /** Energy types (DE/EN) for subtle color-matched hover glow */
  types?: string[];
  /**
   * Soft hover lift + type-colored pulse.
   * Default: on when types are set, or for md/lg sizes.
   */
  hoverGlow?: boolean;
};

export function CardImage({
  src,
  alt,
  className = "",
  size = "md",
  fallbacks = [],
  types,
  hoverGlow,
}: CardImageProps) {
  const sources = [...new Set([src, ...fallbacks].filter(Boolean))];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  // Enable glow by default whenever we have type info, or for larger cards
  const glowEnabled =
    hoverGlow ?? (Boolean(types?.length) || size === "md" || size === "lg");
  const glow = getCardGlowColor(types);

  const glowClass = glowEnabled ? "card-type-glow" : "";
  const glowStyle: CSSProperties | undefined = glowEnabled
    ? ({ ["--card-glow"]: glow } as CSSProperties)
    : undefined;

  const sizeClass =
    size === "sm"
      ? "h-12 w-9"
      : size === "lg"
        ? "aspect-[5/7] w-full"
        : "h-28 w-20";

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  // Outer: glow/shadow (no overflow clip). Inner: rounds + clips image.
  if (failed || sourceIndex >= sources.length || !sources[sourceIndex]) {
    return (
      <div
        className={`${sizeClass} ${glowClass} ${className}`}
        style={glowStyle}
      >
        <div className="flex h-full w-full items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[10px] text-[var(--muted)]">
          {alt.slice(0, 2)}
        </div>
      </div>
    );
  }

  const currentSrc = sources[sourceIndex];

  return (
    <div
      className={`relative ${sizeClass} ${glowClass} ${className}`}
      style={glowStyle}
    >
      <div className="h-full w-full overflow-hidden rounded-[inherit] rounded-lg bg-[var(--surface-elevated)] shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={handleError}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
