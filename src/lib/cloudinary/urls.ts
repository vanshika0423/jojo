import { cloudinaryCloudName } from "@/lib/env";

// URL builders for Cloudinary delivery. Safe for the browser: only the
// (public) cloud name is used. Originals stay untouched in Cloudinary; the
// site always requests optimised derivatives.

const base = () => `https://res.cloudinary.com/${cloudinaryCloudName}`;

function encodePublicId(publicId: string) {
  return publicId.split("/").map(encodeURIComponent).join("/");
}

function asset(
  type: "image" | "video",
  transformation: string,
  publicId: string,
  version?: number | null,
  extension = "",
) {
  const v = version ? `v${version}/` : "";
  const t = transformation ? `${transformation}/` : "";
  return `${base()}/${type}/upload/${t}${v}${encodePublicId(publicId)}${extension}`;
}

export function imageUrl(
  publicId: string,
  {
    width,
    version,
    quality = "auto",
    crop = "limit",
    height,
    format = "auto",
  }: {
    width: number;
    version?: number | null;
    quality?: "auto" | "auto:good" | "auto:eco" | number;
    crop?: "limit" | "fill";
    height?: number;
    format?: "auto" | "jpg";
  },
) {
  const parts = [
    `c_${crop}`,
    `f_${format}`,
    crop === "fill" ? "g_auto" : null,
    height ? `h_${height}` : null,
    `q_${quality}`,
    `w_${width}`,
  ].filter(Boolean);
  return asset("image", parts.join(","), publicId, version);
}

/** A tiny, heavily blurred preview used while the real image loads. */
export function blurUrl(publicId: string, version?: number | null) {
  return asset("image", "c_limit,e_blur:800,f_auto,q_1,w_32", publicId, version);
}

/** Download the original, full-quality file. */
export function downloadUrl(publicId: string, version?: number | null, name = "jojo") {
  const safe = name.replace(/[^a-z0-9-_]/gi, "-").slice(0, 60) || "jojo";
  return asset("image", `fl_attachment:${safe}`, publicId, version);
}

// Video renditions. They are also generated eagerly at upload time (see
// lib/cloudinary/server.ts) so the first visitor never waits for encoding.
export const VIDEO_RENDITIONS = {
  large: "c_limit,q_auto,vc_auto,w_1280",
  small: "c_limit,q_auto,vc_auto,w_720",
} as const;

export function videoUrl(
  publicId: string,
  version?: number | null,
  size: keyof typeof VIDEO_RENDITIONS = "large",
) {
  return asset("video", VIDEO_RENDITIONS[size], publicId, version, ".mp4");
}

export function videoPosterUrl(
  video: {
    publicId: string;
    version?: number | null;
    posterPublicId?: string | null;
    posterVersion?: number | null;
    posterOffset?: number | null;
  },
  width = 1280,
) {
  if (video.posterPublicId) {
    return imageUrl(video.posterPublicId, { width, version: video.posterVersion });
  }
  const offset = video.posterOffset != null ? `so_${Number(video.posterOffset).toFixed(1)}` : "so_auto";
  return asset("video", `${offset}/c_limit,f_auto,q_auto,w_${width}`, video.publicId, video.version, ".jpg");
}
