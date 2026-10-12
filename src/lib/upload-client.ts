import { upload } from "@vercel/blob/client";
import { uploadLimits } from "@/lib/env";
import type { ImageVariant, PhotoUpload, VideoUpload } from "@/lib/types";

// Everything here runs in the browser. Photos are resized here (so visitors
// download small, fast copies) and every file goes straight to Vercel Blob
// using a short-lived token from /api/blob.

export type UploadKind = "photo" | "video" | "poster";

const ROOT = "forever-jojo";
const VARIANT_WIDTHS = [480, 960, 1600, 2400];
const MB = 1024 * 1024;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp)$/i;

export function validateFile(file: File, kind: UploadKind): string | null {
  const isVideo = kind === "video";
  const typeOk = isVideo
    ? file.type.startsWith("video/") || VIDEO_EXT.test(file.name)
    : file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
  if (!typeOk) return isVideo ? "This doesn’t look like a video file." : "This doesn’t look like a photo.";
  const limitMb = isVideo ? uploadLimits.videoMb : uploadLimits.imageMb;
  if (file.size > limitMb * MB) {
    return `Too large (${(file.size / MB).toFixed(1)} MB). The limit is ${limitMb} MB.`;
  }
  return null;
}

function extension(file: File, fallback: string) {
  const fromName = file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  const fromType = file.type.split("/")[1]?.replace("jpeg", "jpg").replace("quicktime", "mov");
  return (fromName ?? fromType ?? fallback).replace("jpeg", "jpg");
}

async function decodeImage(file: Blob): Promise<ImageBitmap> {
  try {
    // Applies the camera's rotation (EXIF) so photos aren't sideways.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "This browser can’t read this photo (iPhone HEIC photos often can’t be read on Windows). Please export it as JPG and try again.",
    );
  }
}

/** Draw a bitmap at `width` pixels wide and encode as WebP (JPEG if WebP isn’t supported). */
async function encode(source: CanvasImageSource, srcW: number, srcH: number, width: number) {
  const height = Math.round((srcH / srcW) * width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can’t resize photos.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", type: "image/webp" };
  const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!jpg) throw new Error("This browser couldn’t resize the photo.");
  return { blob: jpg, ext: "jpg", type: "image/jpeg" };
}

type Part = { path: string; body: Blob; contentType: string };

/** Upload several files in order, reporting combined progress (0–1). */
async function sendAll(parts: Part[], onProgress: (fraction: number) => void) {
  const total = parts.reduce((n, p) => n + p.body.size, 0) || 1;
  let done = 0;
  const urls: string[] = [];
  for (const part of parts) {
    const result = await upload(part.path, part.body, {
      access: "public",
      handleUploadUrl: "/api/blob",
      contentType: part.contentType,
      multipart: part.body.size > 50 * MB,
      onUploadProgress: ({ loaded }) => onProgress(Math.min(1, (done + loaded) / total)),
    });
    done += part.body.size;
    onProgress(done / total);
    urls.push(result.url);
  }
  return urls;
}

function friendly(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/sign in/i.test(message)) return new Error("Your sign-in has expired. Please sign in again.");
  if (/BLOB_READ_WRITE_TOKEN|isn’t set up/i.test(message)) {
    return new Error("File storage isn’t set up yet: add BLOB_READ_WRITE_TOKEN (see README).");
  }
  if (/fetch|network/i.test(message))
    return new Error("Network error — check your connection and try again.");
  return error instanceof Error ? error : new Error(message);
}

function check(file: File, kind: UploadKind) {
  const problem = validateFile(file, kind);
  if (problem) throw new Error(problem);
}

export async function uploadPhoto(file: File, onProgress: (fraction: number) => void): Promise<PhotoUpload> {
  check(file, "photo");
  try {
    const bitmap = await decodeImage(file);
    const { width, height } = bitmap;
    const targets = VARIANT_WIDTHS.filter((w) => w < width);
    if (width <= VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]) targets.push(width);
    const key = `${ROOT}/photos/${crypto.randomUUID()}`;

    const encoded = [];
    for (const w of [...new Set(targets)].sort((a, b) => a - b)) {
      encoded.push({ w, ...(await encode(bitmap, width, height, w)) });
    }
    bitmap.close();

    const originalType = file.type || "image/jpeg";
    const parts: Part[] = [
      ...encoded.map((e) => ({ path: `${key}/w${e.w}.${e.ext}`, body: e.blob, contentType: e.type })),
      { path: `${key}/original.${extension(file, "jpg")}`, body: file, contentType: originalType },
    ];
    const urls = await sendAll(parts, onProgress);
    const variants: ImageVariant[] = encoded.map((e, i) => ({ w: e.w, url: urls[i] }));
    return {
      key,
      originalUrl: urls[urls.length - 1],
      contentType: originalType,
      variants,
      width,
      height,
      originalFilename: file.name.slice(0, 300),
    };
  } catch (error) {
    throw friendly(error);
  }
}

/** A thumbnail image for a video: resized to at most 1600 px wide. */
export async function uploadPoster(file: File, onProgress: (fraction: number) => void) {
  check(file, "poster");
  try {
    const bitmap = await decodeImage(file);
    const out = await encode(bitmap, bitmap.width, bitmap.height, Math.min(1600, bitmap.width));
    bitmap.close();
    const key = `${ROOT}/posters/${crypto.randomUUID()}`;
    const [url] = await sendAll(
      [{ path: `${key}/poster.${out.ext}`, body: out.blob, contentType: out.type }],
      onProgress,
    );
    return { key, url };
  } catch (error) {
    throw friendly(error);
  }
}

/** Read a video's size/duration and grab a frame for its thumbnail. */
async function inspectVideo(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("unreadable"));
      setTimeout(() => reject(new Error("timeout")), 15000);
    });
    const info = {
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      duration: Number.isFinite(video.duration) ? video.duration : null,
    };
    let poster: Awaited<ReturnType<typeof encode>> | null = null;
    try {
      video.currentTime = Math.min(1, (info.duration ?? 2) / 2);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        setTimeout(resolve, 5000);
      });
      if (video.videoWidth) {
        poster = await encode(video, video.videoWidth, video.videoHeight, Math.min(1600, video.videoWidth));
      }
    } catch {
      poster = null;
    }
    return { ...info, poster };
  } catch {
    // The browser can't play this format; upload it anyway without a thumbnail.
    return { width: null, height: null, duration: null, poster: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadVideo(file: File, onProgress: (fraction: number) => void): Promise<VideoUpload> {
  check(file, "video");
  try {
    const info = await inspectVideo(file);
    const key = `${ROOT}/videos/${crypto.randomUUID()}`;
    const contentType = file.type || (/\.mov$/i.test(file.name) ? "video/quicktime" : "video/mp4");
    const parts: Part[] = [{ path: `${key}/video.${extension(file, "mp4")}`, body: file, contentType }];
    if (info.poster) {
      parts.push({
        path: `${key}/poster.${info.poster.ext}`,
        body: info.poster.blob,
        contentType: info.poster.type,
      });
    }
    const [videoUrl, posterUrl] = await sendAll(parts, onProgress);
    return {
      key,
      videoUrl,
      contentType,
      posterUrl: posterUrl ?? null,
      width: info.width,
      height: info.height,
      duration: info.duration,
      originalFilename: file.name.slice(0, 300),
    };
  } catch (error) {
    throw friendly(error);
  }
}
