"use client";

import { useState, useTransition } from "react";
import { deleteVideo, moveVideo, replaceVideo, setVideoPoster, updateVideo } from "@/app/admin/actions/media";
import { Thumb } from "@/components/admin/thumb";
import { notify, report } from "@/components/admin/toast";
import { ConfirmButton, Drawer, EmptyState, Field, StatusPill, Toggle } from "@/components/admin/ui";
import { uploadSingle } from "@/components/admin/uploader";
import { VideoPlayer } from "@/components/video/video-player";
import { isCloudinaryConfigured } from "@/lib/env";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Album, Video } from "@/lib/types";

export function VideoManager({ videos, albums }: { videos: Video[]; albums: Album[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = videos.find((v) => v.id === editingId) ?? null;

  if (videos.length === 0) return <EmptyState>No videos yet. Upload one above.</EmptyState>;

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((video, i) => (
          <li key={video.id} className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(81,68,60,0.08)]">
            <button type="button" className="block w-full text-left" onClick={() => setEditingId(video.id)}>
              <Thumb video={video} size={640} className="aspect-video" />
            </button>
            <div className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-xl text-cocoa">{video.title ?? "Untitled video"}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-taupe-dark">
                  <StatusPill published={video.published} />
                  {video.isFeatured ? <span className="rounded-full bg-cream px-2 py-0.5">★ Featured</span> : null}
                  {video.duration ? formatDuration(video.duration) : null}
                </p>
              </div>
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label="Move earlier"
                  disabled={i === 0 || pending}
                  className="px-2 text-cocoa/60 disabled:opacity-20"
                  onClick={() => startTransition(async () => void report(await moveVideo({ id: video.id, direction: "up" }), "Order updated"))}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Move later"
                  disabled={i === videos.length - 1 || pending}
                  className="px-2 text-cocoa/60 disabled:opacity-20"
                  onClick={() => startTransition(async () => void report(await moveVideo({ id: video.id, direction: "down" }), "Order updated"))}
                >
                  ▼
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Drawer open={Boolean(editing)} onClose={() => setEditingId(null)} title="Edit video" wide>
        {editing ? <VideoEditor key={editing.id} video={editing} albums={albums} onDone={() => setEditingId(null)} /> : null}
      </Drawer>
    </>
  );
}

function VideoEditor({ video, albums, onDone }: { video: Video; albums: Album[]; onDone: () => void }) {
  const [form, setForm] = useState({
    title: video.title ?? "",
    caption: video.caption ?? "",
    recordedOn: video.recordedOn ?? "",
    published: video.published,
    isFeatured: video.isFeatured,
    posterOffset: video.posterOffset != null ? String(video.posterOffset) : "",
    albumIds: video.albumIds,
  });
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    startTransition(async () => {
      const offset = form.posterOffset.trim() === "" ? null : Number(form.posterOffset);
      const res = await updateVideo({
        id: video.id,
        title: form.title,
        caption: form.caption,
        recordedOn: form.recordedOn || null,
        published: form.published,
        isFeatured: form.isFeatured,
        posterOffset: offset != null && Number.isFinite(offset) ? offset : null,
        albumIds: form.albumIds,
      });
      if (report(res, "Video saved")) onDone();
    });

  const upload = async (file: File, kind: "poster" | "video") => {
    try {
      setProgress("0%");
      const asset = await uploadSingle(file, kind, (p) => setProgress(`${Math.round(p * 100)}%`));
      const res = kind === "poster" ? await setVideoPoster({ id: video.id, asset }) : await replaceVideo({ id: video.id, asset });
      report(res, kind === "poster" ? "Thumbnail updated" : "Video replaced");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        {isCloudinaryConfigured ? <VideoPlayer video={video} className="w-full rounded-xl bg-black" /> : null}
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-ghost !px-4 !py-2 cursor-pointer">
            Upload thumbnail image
            <input type="file" accept="image/*" className="sr-only" disabled={progress !== null} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "poster"); }} />
          </label>
          {video.posterPublicId ? (
            <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => startTransition(async () => void report(await setVideoPoster({ id: video.id, asset: null }), "Thumbnail removed"))}>
              Use a frame instead
            </button>
          ) : null}
          <label className="btn btn-ghost !px-4 !py-2 cursor-pointer">
            Replace video
            <input type="file" accept="video/*" className="sr-only" disabled={progress !== null} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f, "video"); }} />
          </label>
        </div>
        {progress ? <p className="text-sm text-cocoa/70" role="status">Uploading… {progress}</p> : null}
        {!video.posterPublicId ? (
          <Field label="Thumbnail frame (seconds into the video)" hint="Leave empty to let Cloudinary pick a good frame automatically.">
            {(id) => <input id={id} type="number" min={0} step={0.5} className="field" value={form.posterOffset} onChange={(e) => set("posterOffset", e.target.value)} />}
          </Field>
        ) : null}
      </div>
      <div className="space-y-5">
        <Field label="Title">{(id) => <input id={id} className="field" maxLength={200} value={form.title} onChange={(e) => set("title", e.target.value)} />}</Field>
        <Field label="Caption">{(id) => <textarea id={id} rows={3} className="field" maxLength={1000} value={form.caption} onChange={(e) => set("caption", e.target.value)} />}</Field>
        <Field label="Date recorded (optional)">{(id) => <input id={id} type="date" min="2017-03-11" className="field" value={form.recordedOn} onChange={(e) => set("recordedOn", e.target.value)} />}</Field>
        <div>
          <p className="label">Albums</p>
          <div className="flex flex-wrap gap-2">
            {albums.map((a) => {
              const on = form.albumIds.includes(a.id);
              return (
                <button key={a.id} type="button" aria-pressed={on} onClick={() => set("albumIds", on ? form.albumIds.filter((x) => x !== a.id) : [...form.albumIds, a.id])} className={cn("rounded-full px-3 py-1 text-xs", on ? "bg-cocoa text-ivory" : "bg-cream text-cocoa/80")}>
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl bg-white p-4">
          <Toggle label="Published" description="Visible on the Videos page" checked={form.published} onChange={(v) => set("published", v)} />
          <Toggle label="Feature on the homepage" description="Only one video can be featured" checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
        </div>
        <div className="flex items-center justify-between border-t border-taupe/25 pt-5">
          <ConfirmButton disabled={pending} onConfirm={() => startTransition(async () => { if (report(await deleteVideo(video.id), "Video deleted")) onDone(); })}>
            Delete video
          </ConfirmButton>
          <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
