"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { VideoPlayer } from "@/components/video/video-player";
import { formatDate } from "@/lib/format";
import type { Video } from "@/lib/types";

export function VideoModal({ video, onClose }: { video: Video | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!video) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [video, onClose]);

  return (
    <AnimatePresence>
      {video ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={video.title ?? "Video of Jojo"}
          className="bg-cocoa-deep/95 fixed inset-0 z-[80] flex flex-col backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="text-ivory/80 flex items-center justify-between px-4 py-3 sm:px-6">
            <p className="text-ivory truncate font-serif text-xl">{video.title ?? ""}</p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-2xl hover:bg-white/10"
              aria-label="Close video"
            >
              ×
            </button>
          </div>
          <motion.div
            className="flex flex-1 items-center justify-center px-2 pb-4 sm:px-8"
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {video.placeholder ? (
              <p className="text-ivory/80 max-w-md text-center font-serif text-2xl">
                Jojo’s videos will play here once they are uploaded.
              </p>
            ) : (
              <VideoPlayer
                video={video}
                autoPlay
                className="max-h-[78dvh] w-full max-w-6xl rounded-xl bg-black"
              />
            )}
          </motion.div>
          {video.caption || video.recordedOn ? (
            <div className="text-ivory/80 mx-auto max-w-3xl px-6 pb-8 text-center">
              {video.caption ? <p className="font-serif text-lg italic">{video.caption}</p> : null}
              {video.recordedOn ? (
                <p className="text-ivory/60 mt-1 text-xs tracking-[0.2em] uppercase">
                  {formatDate(video.recordedOn)}
                </p>
              ) : null}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
