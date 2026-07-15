"use client";

import Image from "next/image";
import { useState } from "react";

type SetLogoProps = {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallbacks?: string[];
};

const sizes = {
  sm: "h-10 w-[4.5rem]",
  md: "h-24 w-full",
  lg: "h-16 w-36",
};

export function SetLogo({
  src,
  alt,
  size = "md",
  className = "",
  fallbacks = [],
}: SetLogoProps) {
  const sources = [...new Set([src, ...fallbacks].filter(Boolean))];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const containerClass = `relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-elevated)] ${sizes[size]} ${className}`;

  if (failed || sourceIndex >= sources.length || !sources[sourceIndex]) {
    return (
      <div
        className={`${containerClass} text-xs font-medium text-[var(--muted)]`}
      >
        {alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  const currentSrc = sources[sourceIndex];

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((index) => index + 1);
    } else {
      setFailed(true);
    }
  };

  const isBanner = className.includes("!h-full") || className.includes("aspect");

  return (
    <div className={containerClass}>
      <Image
        src={currentSrc}
        alt={alt}
        fill
        className={`object-contain ${isBanner ? "p-6 sm:p-8" : "p-2"}`}
        sizes={
          size === "sm"
            ? "72px"
            : size === "lg"
              ? "144px"
              : isBanner
                ? "(max-width: 768px) 100vw, 33vw"
                : "200px"
        }
        onError={handleError}
      />
    </div>
  );
}