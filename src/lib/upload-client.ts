import { uploadLimits } from "@/lib/env";
import type { UploadedAsset } from "@/lib/types";

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  resourceType: "image" | "video";
  params: Record<string, string | number>;
  signature: string;
};

export type UploadKind = "photo" | "video" | "poster";

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif|gif|avif|tiff?)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp|avi|mkv)$/i;

/** Large files go up in 20 MB pieces so a flaky mobile connection can't sink the whole upload. */
const CHUNK_SIZE = 20 * 1024 * 1024;

export function validateFile(file: File, kind: UploadKind): string | null {
  const isVideo = kind === "video";
  const typeOk = isVideo
    ? file.type.startsWith("video/") || VIDEO_EXT.test(file.name)
    : file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
  if (!typeOk) return isVideo ? "This doesn’t look like a video file." : "This doesn’t look like a photo.";
  const limitMb = isVideo ? uploadLimits.videoMb : uploadLimits.imageMb;
  if (file.size > limitMb * 1024 * 1024) {
    return `Too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is ${limitMb} MB.`;
  }
  return null;
}

function postChunk(
  url: string,
  body: FormData,
  headers: Record<string, string>,
  onProgress: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(json);
      else {
        const message = (json.error as { message?: string } | undefined)?.message;
        reject(new Error(message || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(body);
  });
}

/** Upload one file straight from the browser to Cloudinary using a server-made signature. */
export async function uploadFile(
  file: File,
  sig: UploadSignature,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<UploadedAsset> {
  const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;
  const total = file.size;
  const uploadId = `jojo-${crypto.randomUUID()}`;
  let result: Record<string, unknown> = {};

  for (let start = 0; start < total || (total === 0 && start === 0); start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, total);
    const form = new FormData();
    form.append("file", total > CHUNK_SIZE ? file.slice(start, end) : file, file.name);
    form.append("api_key", sig.apiKey);
    form.append("signature", sig.signature);
    for (const [k, v] of Object.entries(sig.params)) form.append(k, String(v));
    const headers: Record<string, string> =
      total > CHUNK_SIZE
        ? { "X-Unique-Upload-Id": uploadId, "Content-Range": `bytes ${start}-${end - 1}/${total}` }
        : {};
    result = await postChunk(
      url,
      form,
      headers,
      (loaded) => onProgress(Math.min(1, (start + loaded) / total)),
      signal,
    );
    if (total <= CHUNK_SIZE) break;
  }

  onProgress(1);
  if (typeof result.public_id !== "string" || typeof result.signature !== "string") {
    throw new Error("Cloudinary didn’t confirm the upload. Please try again.");
  }
  return {
    public_id: result.public_id,
    version: Number(result.version),
    signature: result.signature,
    width: typeof result.width === "number" ? result.width : undefined,
    height: typeof result.height === "number" ? result.height : undefined,
    format: typeof result.format === "string" ? result.format : undefined,
    bytes: typeof result.bytes === "number" ? result.bytes : undefined,
    duration: typeof result.duration === "number" ? result.duration : undefined,
    original_filename: typeof result.original_filename === "string" ? result.original_filename : undefined,
  };
}
