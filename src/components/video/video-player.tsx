"use client";

import { videoPosterUrl, videoUrl } from "@/lib/cloudinary/urls";
import type { Video } from "@/lib/types";

/**
 * Plays an optimised MP4 rendition: 720p on phones, 1280p elsewhere. Both are
 * generated at upload time and streamed with HTTP range requests.
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
      poster={videoPosterUrl(video, 1280)}
      aria-label={video.title ?? "A video of Jojo"}
    >
      <source media="(max-width: 768px)" src={videoUrl(video.publicId, video.version, "small")} type="video/mp4" />
      <source src={videoUrl(video.publicId, video.version, "large")} type="video/mp4" />
      Your browser can’t play this video.
    </video>
  );
}
