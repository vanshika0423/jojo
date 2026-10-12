import "server-only";
import { del, head } from "@vercel/blob";
import { realValue } from "@/lib/env";

// Photos and videos are stored in Vercel Blob. Browsers upload straight to
// Blob with short-lived tokens issued by /api/blob (admins only); the server
// then checks every file really exists in *our* store before saving it.

export const MEDIA_ROOT = "forever-jojo";

export const isStorageConfigured = Boolean(realValue(process.env.BLOB_READ_WRITE_TOKEN));

export type MediaKind = "photos" | "videos" | "posters";

/** "<root>/<kind>/<uuid>" — the folder holding one item's files. */
const KEY_PATTERN = new RegExp(
  `^${MEDIA_ROOT}/(photos|videos|posters)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`,
);

/** Allowed file names inside an item's folder. */
const FILE_PATTERN =
  /^(original\.[a-z0-9]{2,5}|w\d{2,4}\.(webp|jpg)|poster\.(webp|jpg)|video\.[a-z0-9]{2,5})$/;

export function isValidKey(key: string, kind: MediaKind) {
  return KEY_PATTERN.test(key) && key.startsWith(`${MEDIA_ROOT}/${kind}/`);
}

/** Validate a pathname a browser wants to upload to. */
export function parseUploadPath(pathname: string): { kind: MediaKind; key: string; file: string } | null {
  const i = pathname.lastIndexOf("/");
  const key = pathname.slice(0, i);
  const file = pathname.slice(i + 1);
  const kind = key.split("/")[1] as MediaKind;
  if (!["photos", "videos", "posters"].includes(kind) || !isValidKey(key, kind) || !FILE_PATTERN.test(file)) {
    return null;
  }
  return { kind, key, file };
}

export class StorageVerificationError extends Error {}

/**
 * Confirms a URL points at a file in our Blob store, inside the expected
 * folder. Returns its size. Throws StorageVerificationError otherwise.
 */
export async function verifyBlob(url: string, key: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new StorageVerificationError("Invalid file address.");
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".blob.vercel-storage.com") ||
    parsed.search
  ) {
    throw new StorageVerificationError("That file isn’t in this site’s storage.");
  }
  try {
    const info = await head(url);
    if (!info.pathname.startsWith(`${key}/`)) throw new Error("wrong folder");
    return { size: info.size, contentType: info.contentType };
  } catch {
    throw new StorageVerificationError("That upload couldn’t be verified. Please try uploading it again.");
  }
}

/** Delete files; the database is the source of truth, so failures are only logged. */
export async function deleteBlobs(urls: Array<string | null | undefined>) {
  const list = urls.filter((u): u is string => Boolean(u));
  if (!list.length) return;
  try {
    await del(list);
  } catch (error) {
    console.error("[storage] delete failed", error);
  }
}
