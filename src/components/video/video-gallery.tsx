"use client";

import { useCallback, useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { PlayIcon } from "@/components/video/play-icon";
import { VideoModal } from "@/components/video/video-modal";
import { VideoPoster } from "@/components/video/video-poster";
import { formatDate, formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Album, Video } from "@/lib/types";

export function VideoGallery({ videos, albums }: { videos: Video[]; albums: Album[] }) {
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const close = useCallback(() => setPlaying(null), []);

  const usedAlbums = albums.filter((a) => videos.some((v) => v.albumIds.includes(a.id)));
  const visible = albumId ? videos.filter((v) => v.albumIds.includes(albumId)) : videos;

  return (
    <>
      {usedAlbums.length ? (
        <nav aria-label="Video albums" className="no-scrollbar mb-10 flex gap-2 overflow-x-auto">
          {[{ id: null, name: "All videos" }, ...usedAlbums].map((a) => (
            <button
              key={a.id ?? "all"}
              type="button"
              aria-pressed={albumId === a.id}
              onClick={() => setAlbumId(a.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
                albumId === a.id ? "bg-cocoa text-ivory" : "bg-cream/80 text-cocoa/80 hover:bg-cream",
              )}
            >
              {a.name}
            </button>
          ))}
        </nav>
      ) : null}

      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((video, i) => (
          <Reveal as="li" key={video.id} delay={(i % 3) * 0.08}>
            <button
              type="button"
              onClick={() => setPlaying(video)}
              className="photo-zoom group block w-full text-left"
              aria-label={`Play ${video.title ?? "video"}`}
            >
              <span className="relative block aspect-video overflow-hidden rounded-[var(--radius-photo)] bg-cream">
                <VideoPoster video={video} />
                <span className="absolute inset-0 bg-cocoa-deep/10 transition-colors duration-500 group-hover:bg-cocoa-deep/25" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <PlayIcon />
                </span>
                {video.duration ? (
                  <span className="absolute bottom-3 right-3 rounded-full bg-cocoa-deep/70 px-2.5 py-0.5 text-xs text-ivory">
                    {formatDuration(video.duration)}
                  </span>
                ) : null}
              </span>
              <span className="mt-4 block font-serif text-2xl text-cocoa">
                {video.title ?? (video.placeholder ? "A video of Jojo" : "Untitled")}
              </span>
              {video.recordedOn ? (
                <span className="eyebrow mt-1 block">{formatDate(video.recordedOn)}</span>
              ) : null}
              {video.caption ? (
                <span className="mt-2 block line-clamp-2 text-sm text-cocoa/70">{video.caption}</span>
              ) : null}
            </button>
          </Reveal>
        ))}
      </ul>

      <VideoModal video={playing} onClose={close} />
    </>
  );
}
