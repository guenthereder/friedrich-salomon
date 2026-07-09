"use client";

import type { ImageSrc } from "@/lib/images";

type Props = {
  src: ImageSrc;
  alt: string;
  variant?: "thumb" | "full";
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain" | "natural";
};

/**
 * Renders an image with download-prevention.
 * - "cover": fills the parent cell, crops if needed (gallery grid).
 * - "contain": fills parent but keeps aspect ratio (detail page, fixed-height container).
 * - "natural": image takes its own intrinsic width/height (detail page, no fixed container).
 */
export function ProtectedImage({
  src,
  alt,
  variant = "thumb",
  priority,
  className = "",
  fit = "cover",
}: Props) {
  const url = variant === "thumb" ? src.thumb : src.full;

  if (fit === "natural") {
    return (
      <div className={`relative block w-full overflow-hidden ${className}`}>
        <img
          src={url}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="block h-auto w-full object-contain"
          data-protected
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
        <div className="image-shield" aria-hidden />
      </div>
    );
  }

  const fitClass = fit === "contain" ? "object-contain" : "object-cover";
  return (
    <div className={`relative block h-full w-full overflow-hidden ${className}`}>
      <img
        src={url}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`block h-full w-full ${fitClass}`}
        data-protected
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      <div className="image-shield" aria-hidden />
    </div>
  );
}
