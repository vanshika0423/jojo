import type { ImageVariant, Photo } from "@/lib/types";

// Browser-safe helpers for showing uploaded photos.

export function srcSet(variants: ImageVariant[]) {
  return variants.map((v) => `${v.url} ${v.w}w`).join(", ");
}

/** The smallest copy at least `width` wide (or the largest available). */
export function pickVariant(variants: ImageVariant[], width: number) {
  if (!variants.length) return null;
  return variants.find((v) => v.w >= width) ?? variants[variants.length - 1];
}

export function hasImage(photo: Pick<Photo, "variants" | "placeholder"> | null | undefined) {
  return Boolean(photo && !photo.placeholder && photo.variants.length);
}

/** Vercel Blob serves any file as a download when ?download=1 is added. */
export function downloadUrl(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}
