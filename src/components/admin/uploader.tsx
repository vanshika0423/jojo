"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUploadSignature, recordPhotoUploads, recordVideoUploads } from "@/app/admin/actions/media";
import { notify } from "@/components/admin/toast";
import { uploadLimits } from "@/lib/env";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Album, UploadedAsset } from "@/lib/types";
import { uploadFile, validateFile, type UploadKind, type UploadSignature } from "@/lib/upload-client";

const signatures = new Map<UploadKind, { sig: UploadSignature; at: number }>();

/** Signatures are valid for an hour; refresh well before that. */
async function getSignature(kind: UploadKind): Promise<UploadSignature> {
  const cached = signatures.get(kind);
  if (cached && Date.now() - cached.at < 45 * 60 * 1000) return cached.sig;
  const res = await getUploadSignature(kind);
  if (!res.ok) throw new Error(res.error);
  signatures.set(kind, { sig: res.data, at: Date.now() });
  return res.data;
}

/** Upload a single file (used for “replace” and video thumbnails). */
export async function uploadSingle(
  file: File,
  kind: UploadKind,
  onProgress: (fraction: number) => void = () => {},
): Promise<UploadedAsset> {
  const problem = validateFile(file, kind);
  if (problem) throw new Error(problem);
  return uploadFile(file, await getSignature(kind), onProgress);
}

type Item = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "saving" | "done" | "error";
  progress: number;
  error?: string;
};

const CONCURRENCY = 3;

export function Uploader({ kind, albums }: { kind: "photo" | "video"; albums: Album[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [publish, setPublish] = useState(false);
  const [albumIds, setAlbumIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const running = useRef(0);
  const queue = useRef<Item[]>([]);
  const options = useRef({ publish, albumIds });
  useEffect(() => {
    options.current = { publish, albumIds };
  }, [publish, albumIds]);

  const isVideo = kind === "video";
  const limit = isVideo ? uploadLimits.videoMb : uploadLimits.imageMb;
  const noun = isVideo ? "video" : "photo";

  const patch = (id: string, values: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...values } : it)));

  const pump = useCallback(async () => {
    while (running.current < CONCURRENCY && queue.current.length) {
      const item = queue.current.shift()!;
      running.current++;
      void (async () => {
        try {
          patch(item.id, { status: "uploading", progress: 0, error: undefined });
          const sig = await getSignature(kind);
          const asset = await uploadFile(item.file, sig, (p) => patch(item.id, { progress: p }));
          patch(item.id, { status: "saving", progress: 1 });
          const record = isVideo ? recordVideoUploads : recordPhotoUploads;
          const res = await record({ assets: [asset], ...options.current });
          if (!res.ok) throw new Error(res.error);
          patch(item.id, { status: "done" });
        } catch (error) {
          patch(item.id, { status: "error", error: error instanceof Error ? error.message : "Upload failed" });
        } finally {
          running.current--;
          if (running.current === 0 && queue.current.length === 0) {
            notify(`Uploads finished`);
          }
          void pump();
        }
      })();
    }
  }, [isVideo, kind]);

  const addFiles = (files: FileList | File[]) => {
    const next: Item[] = Array.from(files).map((file) => {
      const problem = validateFile(file, kind);
      return {
        id: crypto.randomUUID(),
        file,
        status: problem ? "error" : "queued",
        progress: 0,
        error: problem ?? undefined,
      };
    });
    setItems((list) => [...next, ...list.filter((i) => i.status !== "done")]);
    queue.current.push(...next.filter((i) => i.status === "queued"));
    void pump();
  };

  const retry = (item: Item) => {
    if (validateFile(item.file, kind)) return;
    patch(item.id, { status: "queued", error: undefined, progress: 0 });
    queue.current.push(item);
    void pump();
  };

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const active = items.filter((i) => i.status === "uploading" || i.status === "saving" || i.status === "queued").length;

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-sage-dark bg-sage/15" : "border-taupe/60 bg-cream/40",
        )}
      >
        <p className="font-serif text-2xl text-cocoa">Drop {noun}s here</p>
        <p className="mt-1 text-sm text-cocoa/70">or</p>
        <button type="button" className="btn btn-primary mt-3" onClick={() => inputRef.current?.click()}>
          Choose {noun}s
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={isVideo ? "video/*" : "image/*,.heic,.heif"}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="hint mt-4 max-w-md">
          {isVideo
            ? `MP4 or MOV, up to ${limit} MB each. Large videos are uploaded in pieces and compressed automatically for smooth playback.`
            : `JPG, PNG, HEIC or WebP, up to ${limit} MB each. You can select many at once — originals are kept safe and the website shows optimised copies.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="rounded-2xl bg-white p-4">
          <legend className="label px-1">After uploading</legend>
          <label className="flex items-start gap-2 py-1 text-sm">
            <input type="radio" name={`${kind}-publish`} checked={!publish} onChange={() => setPublish(false)} className="mt-1 accent-cocoa" />
            <span>
              <strong className="font-medium">Keep as drafts</strong> — review captions first, then publish
            </span>
          </label>
          <label className="flex items-start gap-2 py-1 text-sm">
            <input type="radio" name={`${kind}-publish`} checked={publish} onChange={() => setPublish(true)} className="mt-1 accent-cocoa" />
            <span>
              <strong className="font-medium">Publish immediately</strong> — visible on the website right away
            </span>
          </label>
        </fieldset>
        <fieldset className="rounded-2xl bg-white p-4">
          <legend className="label px-1">Add to albums (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {albums.map((a) => {
              const on = albumIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAlbumIds((ids) => (on ? ids.filter((x) => x !== a.id) : [...ids, a.id]))}
                  className={cn("rounded-full px-3 py-1 text-xs", on ? "bg-cocoa text-ivory" : "bg-cream text-cocoa/80")}
                >
                  {a.name}
                </button>
              );
            })}
            {albums.length === 0 ? <p className="hint">Create albums on the Albums page.</p> : null}
          </div>
        </fieldset>
      </div>

      {items.length ? (
        <div className="rounded-2xl bg-white p-4">
          <p className="mb-3 text-sm text-cocoa/80" aria-live="polite">
            {active ? `Uploading… ${done} of ${items.length} done` : `${done} uploaded`}
            {failed ? ` · ${failed} need attention` : ""}
          </p>
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-cream px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{item.file.name}</span>
                  <span className="shrink-0 text-xs text-taupe-dark">
                    {formatBytes(item.file.size)} ·{" "}
                    {
                      {
                        queued: "Waiting",
                        uploading: `${Math.round(item.progress * 100)}%`,
                        saving: "Saving…",
                        done: "✓ Done",
                        error: "Failed",
                      }[item.status]
                    }
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300",
                      item.status === "error" ? "bg-[#9b3d32]" : item.status === "done" ? "bg-sage-dark" : "bg-cocoa",
                    )}
                    style={{ width: `${item.status === "error" ? 100 : Math.round(item.progress * 100)}%` }}
                  />
                </div>
                {item.error ? (
                  <p className="mt-1 flex items-center justify-between gap-2 text-xs text-[#9b3d32]">
                    {item.error}
                    {!validateFile(item.file, kind) ? (
                      <button type="button" className="underline" onClick={() => retry(item)}>
                        Retry
                      </button>
                    ) : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
