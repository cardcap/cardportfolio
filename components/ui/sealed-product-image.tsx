"use client";

import { useState } from "react";

type SealedProductImageProps = {
  src?: string | null;
  fallbacks?: string[];
  alt: string;
  /** Product type label shown as badge */
  badge?: string;
  language?: string;
  className?: string;
  /** sm = list thumb, md = card, lg = hero */
  size?: "sm" | "md" | "lg";
  /** Gradient hue 0–360 when no image loads */
  hue?: number;
};

export function SealedProductImage({
  src,
  fallbacks = [],
  alt,
  badge,
  language,
  className = "",
  size = "md",
  hue = 280,
}: SealedProductImageProps) {
  const sources = [...new Set([src, ...fallbacks].filter(Boolean))] as string[];
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(sources.length === 0);

  const sizeClass =
    size === "sm"
      ? "h-12 w-12"
      : size === "lg"
        ? "aspect-[4/5] w-full"
        : "aspect-[4/5] w-full";

  const showImage = !failed && index < sources.length;

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${sizeClass} ${className}`}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 42% 24%), #0c0c10 72%)`,
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sources[index]}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (index < sources.length - 1) setIndex((i) => i + 1);
            else setFailed(true);
          }}
          className="relative z-[1] h-full w-full object-contain p-1.5 drop-shadow-md sm:p-2"
        />
      ) : (
        <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white/50"
            aria-hidden
          >
            <path
              d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12 12 4 7M12 12l8-5M12 12v10"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          {badge && (
            <span className="text-[9px] font-medium leading-tight text-white/70">
              {badge}
            </span>
          )}
        </div>
      )}

      {language && (
        <span className="absolute left-1.5 top-1.5 z-[2] rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white/90 backdrop-blur-sm">
          {language}
        </span>
      )}
      {badge && size !== "sm" && (
        <span className="absolute bottom-1.5 left-1.5 right-1.5 z-[2] truncate rounded bg-black/55 px-1.5 py-0.5 text-center text-[9px] font-medium text-white/85 backdrop-blur-sm">
          {badge}
        </span>
      )}
    </div>
  );
}
