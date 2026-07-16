"use client";

import { useState } from "react";
import { getCardGlowColor } from "@/lib/card-colors";

type CardImageProps = {
  src: string;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  fallbacks?: string[];
  /** Energy types (DE/EN) for subtle color-matched hover glow */
  types?: string[];
  /** Enable soft hover lift + pulse (default true for md/lg) */
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
  const glowEnabled = hoverGlow ?? size !== "sm";
  const glow = getCardGlowColor(types);

  const glowClass = glowEnabled ? "card-type-glow" : "";
  const glowStyle = glowEnabled
    ? ({ ["--card-glow" as string]: glow } as React.CSSProperties)
    : undefined;

  const placeholderClass = `flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] ${
    size === "sm"
      ? "h-12 w-9 text-[8px]"
      : size === "lg"
        ? "aspect-[5/7] w-full text-xs"
        : "h-28 w-20 text-[10px]"
  } ${className}`;

  if (failed || sourceIndex >= sources.length) {
    return (
      <div className={`${placeholderClass} ${glowClass}`} style={glowStyle}>
        {alt.slice(0, 2)}
      </div>
    );
  }

  const currentSrc = sources[sourceIndex];

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  if (size === "lg") {
    return (
      <div
        className={`relative aspect-[5/7] overflow-hidden rounded-lg bg-[var(--surface-elevated)] shadow-sm ${glowClass} ${className}`}
        style={glowStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          onError={handleError}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  const dim = size === "sm" ? "h-12 w-9" : "h-28 w-20";

  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[var(--surface-elevated)] shadow-sm ${dim} ${glowClass} ${className}`}
      style={glowStyle}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onError={handleError}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
