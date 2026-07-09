"use client";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** Gallery image with download-prevention event handlers (client-side). */
export function GalleryImage({ src, alt, className = "" }: Props) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${className}`}
      data-protected
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}
