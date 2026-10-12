"use client";

import { useCallback, useState } from "react";
import { PlayIcon } from "@/components/video/play-icon";
import { VideoModal } from "@/components/video/video-modal";
import type { Video } from "@/lib/types";

export function FeaturedVideo({ video, poster }: { video: Video; poster: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="photo-zoom group bg-cream relative block aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-photo)] text-left"
        aria-label={`Play video${video.title ? `: ${video.title}` : ""}`}
      >
        {poster}
        <span className="from-cocoa-deep/50 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center">
          <PlayIcon />
        </span>
        {video.title ? (
          <span className="text-ivory absolute right-6 bottom-5 left-6 font-serif text-2xl sm:text-3xl">
            {video.title}
          </span>
        ) : null}
      </button>
      <VideoModal video={open ? video : null} onClose={close} />
    </>
  );
}
