"use client";

import { useEffect } from "react";

/**
 * Deterrent layer against casual image downloads.
 * Not foolproof — determined users can still screenshot or inspect network.
 */
export function DownloadGuard() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-protected], img")) e.preventDefault();
    };
    const onDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-protected], img")) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (key === "s" || key === "u")) e.preventDefault();
      if (ctrl && e.shiftKey && (key === "i" || key === "j" || key === "c")) e.preventDefault();
      if (key === "f12") e.preventDefault();
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
