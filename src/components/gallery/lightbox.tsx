"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { PhotoPlaceholder } from "@/components/media/photo-placeholder";
import { ResponsiveImage } from "@/components/media/responsive-image";
import { downloadUrl, hasImage } from "@/lib/media";
import { formatDate } from "@/lib/format";
import type { Photo } from "@/lib/types";

type LightboxProps = {
  photos: Photo[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  allowDownloads: boolean;
  /** Called when the viewer gets close to the end, to fetch more photos. */
  onNearEnd?: () => void;
};

const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 400;

export function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  allowDownloads,
  onNearEnd,
}: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [direction, setDirection] = useState(0);
  const open = index !== null && index >= 0 && index < photos.length;
  const photo = open ? photos[index] : null;

  const go = useCallback(
    (delta: 1 | -1) => {
      if (index === null) return;
      const next = index + delta;
      if (next < 0 || next >= photos.length) return;
      setDirection(delta);
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  useEffect(() => {
    if (open && index !== null && index >= photos.length - 5) onNearEnd?.();
  }, [open, index, photos.length, onNearEnd]);

  // The keyboard listener below lives as long as the viewer is open, so it
  // reads the latest callbacks through refs.
  const goRef = useRef(go);
  const closeFnRef = useRef(onClose);
  useEffect(() => {
    goRef.current = go;
    closeFnRef.current = onClose;
  });

  // Keyboard navigation, focus management and scroll lock.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFnRef.current();
      else if (e.key === "ArrowRight") goRef.current(1);
      else if (e.key === "ArrowLeft") goRef.current(-1);
      else if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) go(1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) go(-1);
  };

  const canDownload =
    allowDownloads && photo && hasImage(photo) && photo.allowDownload && Boolean(photo.originalUrl);

  return (
    <AnimatePresence>
      {open && photo ? (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="bg-cocoa-deep/[0.97] text-ivory fixed inset-0 z-[80] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-4">
            <p className="text-ivory/60 text-xs tracking-[0.2em]" aria-live="polite">
              {index! + 1} / {photos.length}
            </p>
            <div className="flex items-center gap-1">
              {canDownload ? (
                <a
                  href={downloadUrl(photo.originalUrl)}
                  className="text-ivory/80 hover:text-ivory flex h-11 items-center gap-2 rounded-full px-4 text-sm hover:bg-white/10"
                  download
                >
                  <span aria-hidden>↓</span> Download
                </a>
              ) : null}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full text-3xl font-light hover:bg-white/10"
                aria-label="Close photo viewer"
              >
                ×
              </button>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={photo.id}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d * 60 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d: number) => ({ opacity: 0, x: d * -60 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={onDragEnd}
                className="absolute inset-0 flex cursor-grab touch-pan-y items-center justify-center px-2 active:cursor-grabbing sm:px-20"
              >
                <div className="relative h-full w-full">
                  {!hasImage(photo) ? (
                    <div className="absolute inset-[8%] overflow-hidden rounded-2xl">
                      <PhotoPlaceholder tone={index!} />
                    </div>
                  ) : (
                    <ResponsiveImage
                      variants={photo.variants}
                      alt={photo.alt || photo.caption || "A photograph of Jojo"}
                      sizes="100vw"
                      priority
                      className="pointer-events-none object-contain select-none"
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              aria-label="Previous photo"
              className="absolute top-1/2 left-3 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl backdrop-blur transition hover:bg-white/20 disabled:opacity-0 sm:flex"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index === photos.length - 1}
              aria-label="Next photo"
              className="absolute top-1/2 right-3 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl backdrop-blur transition hover:bg-white/20 disabled:opacity-0 sm:flex"
            >
              →
            </button>
          </div>

          <div className="min-h-24 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
            {photo.isFavourite ? (
              <p className="text-sage mb-1 text-xs tracking-[0.25em] uppercase">♥ One of our favourites</p>
            ) : null}
            {photo.caption ? (
              <p className="text-ivory/90 mx-auto max-w-2xl font-serif text-xl leading-snug italic">
                {photo.caption}
              </p>
            ) : null}
            {photo.takenOn ? (
              <p className="text-ivory/55 mt-1 text-xs tracking-[0.2em] uppercase">
                {formatDate(photo.takenOn)}
              </p>
            ) : null}
            <p className="text-ivory/40 mt-2 text-[0.7rem] sm:hidden">Swipe to see more</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
