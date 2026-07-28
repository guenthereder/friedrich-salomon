"use client";

import { useRef, useState, useLayoutEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ResponsiveLayout, PlacedItem } from "@/lib/layout";
import { GalleryImage } from "./GalleryImage";

export function JustifiedGallery({
  layout,
  emptyLabel,
}: {
  layout: ResponsiveLayout;
  emptyLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeBp, setActiveBp] = useState<number | null>(null);
  const [containerW, setContainerW] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const bps = layout.breakpoints;
      let best = bps[0];
      for (const bp of bps) {
        if (w >= bp) best = bp;
      }
      setActiveBp(best);
      setContainerW(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  if (layout.breakpoints.length === 0) {
    return <p className="py-12 text-center text-sm text-ink/40">{emptyLabel}</p>;
  }

  return (
    <div ref={ref} className="w-full">
      {layout.breakpoints.map((bp) => {
        const computed = layout.layouts[bp];
        if (!computed || computed.items.length === 0) return null;
        const visible = activeBp === bp || (activeBp === null && bp === layout.breakpoints[0]);
        const scale = containerW > 0 ? containerW / computed.containerWidth : 1;
        return (
          <div
            key={bp}
            style={{
              display: visible ? "block" : "none",
              position: "relative",
              width: "100%",
              height: `${Math.round(computed.totalHeight * scale)}px`,
            }}
          >
            {computed.items.map((item, i) => (
              <PlacedCell key={item.nodeId + (item.isText ? "-t" : "") + i} item={item} scale={scale} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PlacedCell({ item, scale }: { item: PlacedItem; scale: number }) {
  const style = {
    position: "absolute" as const,
    left: `${Math.round(item.x * scale)}px`,
    top: `${Math.round(item.y * scale)}px`,
    width: `${Math.round(item.width * scale)}px`,
    height: `${Math.round(item.height * scale)}px`,
  };

  // Text block
  if (item.isText) {
    return (
      <div
        className="flex flex-col justify-center overflow-hidden rounded-sm border border-ink/10 bg-white/60 px-5 py-4"
        style={style}
      >
        {item.textTitle && (
          <h3 className="mb-2 font-serif text-base tracking-wide text-ink">{item.textTitle}</h3>
        )}
        <div className="prose prose-sm max-w-none overflow-hidden text-xs leading-relaxed text-ink/70">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.textBody ?? ""}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // Collection tile with cover
  if (item.type === "collection" && item.src) {
    return (
      <Link href={item.href} className="group relative overflow-hidden rounded-sm bg-ink/5" style={style}>
        <GalleryImage src={item.src.thumb} alt={item.title} />
        <div
          className="absolute inset-0"
          style={{ zIndex: 5, background: "transparent", pointerEvents: "auto" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-serif text-lg text-parchment drop-shadow-lg">{item.title || item.href}</p>
          {item.body && (
            <p className="mt-1 line-clamp-2 text-xs text-parchment/70">{item.body.slice(0, 140)}</p>
          )}
        </div>
      </Link>
    );
  }

  // Image
  if (!item.src) return null;

  return (
    <Link href={item.href} className="group relative overflow-hidden rounded-sm bg-ink/5" style={style}>
      <GalleryImage src={item.src.thumb} alt={item.title} />
      <div
        className="absolute inset-0"
        style={{ zIndex: 5, background: "transparent", pointerEvents: "auto" }}
        aria-hidden
      />
      {item.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <p className="text-xs text-parchment">{item.title}</p>
        </div>
      )}
    </Link>
  );
}
