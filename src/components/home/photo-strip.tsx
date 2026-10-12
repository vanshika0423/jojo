"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/** A horizontally scrolling row of photographs with snap points. */
export function PhotoStrip({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto scroll-smooth px-5 pb-4 sm:scroll-px-10 sm:gap-6 sm:px-10"
      >
        {children}
      </div>
      <div className="mt-6 hidden justify-end gap-2 px-10 sm:flex">
        {([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => scrollBy(dir)}
            aria-label={dir < 0 ? "Previous photos" : "Next photos"}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border border-cocoa/20 text-cocoa transition-colors hover:bg-cream",
            )}
          >
            <span aria-hidden>{dir < 0 ? "←" : "→"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
