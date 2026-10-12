"use client";

import type { Video } from "@/lib/types";

/**
 * Plays the video file as uploaded, streamed from Vercel Blob with HTTP range
 * requests (nothing downloads until play is pressed unless autoPlay is set).
 */
export function VideoPlayer({
  video,
  autoPlay = false,
  className,
}: {
  video: Video;
  autoPlay?: boolean;
  className?: string;
}) {
  return (
    <video
      key={video.id}
      className={className}
      controls
      playsInline
      autoPlay={autoPlay}
      preload={autoPlay ? "auto" : "none"}
      poster={video.posterUrl ?? undefined}
      aria-label={video.title ?? "A video of Jojo"}
    >
      <source
        src={video.videoUrl}
        type={video.contentType === "video/quicktime" ? "video/mp4" : (video.contentType ?? "video/mp4")}
      />
      This video can’t be played in this browser.
    </video>
  );
}
