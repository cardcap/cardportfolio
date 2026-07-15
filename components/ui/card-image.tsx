"use client";

import { useState } from "react";

type CardImageProps = {
  src: string;
  alt: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  fallbacks?: string[];
};

export function CardImage({
  src,
  alt,
  className = "",
  size = "md",
  fallbacks = [],
}: CardImageProps) {
  const sources = [...new Set([src, ...fallbacks].filter(Boolean))];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const placeholderClass = `flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] ${
    size === "sm"
      ? "h-12 w-9 text-[8px]"
      : size === "lg"
        ? "aspect-[5/7] w-full text-xs"
        : "h-28 w-20 text-[10px]"
  } ${className}`;

  if (failed || sourceIndex >= sources.length) {
    return <div className={placeholderClass}>{alt.slice(0, 2)}</div>;
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
        className={`relative aspect-[5/7] overflow-hidden rounded-lg bg-[var(--surface-elevated)] shadow-sm ${className}`}
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
      className={`relative overflow-hidden rounded-md bg-[var(--surface-elevated)] shadow-sm ${dim} ${className}`}
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