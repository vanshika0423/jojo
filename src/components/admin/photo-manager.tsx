"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveSettings } from "@/app/admin/actions/content";
import {
  bulkUpdatePhotos,
  listPhotos,
  movePhoto,
  replacePhoto,
  updatePhoto,
} from "@/app/admin/actions/media";
import { Thumb } from "@/components/admin/thumb";
import { notify, report } from "@/components/admin/toast";
import { ConfirmButton, Drawer, EmptyState, Field, StatusPill, Toggle } from "@/components/admin/ui";
import { uploadSingle } from "@/components/admin/uploader";
import type { AdminPhotoFilter } from "@/lib/data/admin";
import { formatBytes } from "@/lib/format";
import { imageUrl } from "@/lib/cloudinary/urls";
import { isCloudinaryConfigured } from "@/lib/env";
import type { HeroSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";
import type { AdminPhoto, Album } from "@/lib/types";

type ListState = { photos: AdminPhoto[]; total: number; hasMore: boolean };

const filters: Array<{ value: AdminPhotoFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "favourites", label: "Favourites" },
];

export function PhotoManager({
  albums,
  initial,
  hero,
}: {
  albums: Album[];
  initial: ListState;
  hero: HeroSettings;
}) {
  const [filter, setFilter] = useState<AdminPhotoFilter>("all");
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [list, setList] = useState<ListState>(initial);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminPhoto | null>(null);
  const [bulkAlbum, setBulkAlbum] = useState("");
  const [pending, startTransition] = useTransition();
  const dragId = useRef<string | null>(null);

  // The server re-sends the first page after every change (e.g. new uploads).
  // Adopt it when the default view is showing.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (filter === "all" && !albumId && !q.trim()) setList(initial);
  }
  const firstRender = useRef(true);

  const load = useCallback(
    async (offset = 0) => {
      setLoading(true);
      const res = await listPhotos({ filter, albumId, q, offset, limit: 60 });
      setLoading(false);
      if (!res.ok) return notify(res.error, "error");
      setList((prev) =>
        offset === 0 ? res.data : { ...res.data, photos: [...prev.photos, ...res.data.photos] },
      );
    },
    [filter, albumId, q],
  );

  // Reload when filters change (debounced for typing).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => void load(0), 300);
    return () => clearTimeout(t);
  }, [load]);

  const reload = () => load(0);
  const canReorder = filter === "all" && !albumId && !q.trim();

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = (op: Parameters<typeof bulkUpdatePhotos>[0]["op"], label: string) =>
    startTransition(async () => {
      const ids = [...selected];
      const res = await bulkUpdatePhotos({ ids, op, albumId: bulkAlbum || undefined });
      if (report(res, `${label} ${ids.length} photo${ids.length === 1 ? "" : "s"}`)) {
        setSelected(new Set());
        await reload();
      }
    });

  const onDrop = (targetId: string) => {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const photos = [...list.photos];
    const from = photos.findIndex((p) => p.id === sourceId);
    const to = photos.findIndex((p) => p.id === targetId);
    const [moved] = photos.splice(from, 1);
    photos.splice(to, 0, moved);
    setList((l) => ({ ...l, photos }));
    const afterId = photos[to - 1]?.id ?? null;
    const beforeId = photos[to + 1]?.id ?? null;
    startTransition(async () => {
      const res = await movePhoto({ id: sourceId, afterId, beforeId });
      if (!res.ok) {
        notify(res.error, "error");
        await reload();
      }
    });
  };

  const moveToTop = (photo: AdminPhoto) =>
    startTransition(async () => {
      const first = list.photos[0];
      if (!first || first.id === photo.id) return;
      if (report(await movePhoto({ id: photo.id, afterId: null, beforeId: first.id }), "Moved to the top"))
        await reload();
    });

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm",
                filter === f.value ? "bg-cocoa text-ivory" : "text-cocoa/80 hover:bg-cream bg-white",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="Filter by album"
            className="field !py-2 sm:w-48"
            value={albumId ?? ""}
            onChange={(e) => setAlbumId(e.target.value || null)}
          >
            <option value="">Every album</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            aria-label="Search photos"
            placeholder="Search caption, tag or file name"
            className="field !py-2 sm:w-64"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {selected.size ? (
        <div className="bg-cocoa text-ivory sticky top-28 z-30 mb-5 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-lg lg:top-4">
          <span className="mr-2 font-medium">{selected.size} selected</span>
          <BulkButton onClick={() => runBulk("publish", "Published")} disabled={pending}>
            Publish
          </BulkButton>
          <BulkButton onClick={() => runBulk("unpublish", "Unpublished")} disabled={pending}>
            Unpublish
          </BulkButton>
          <BulkButton onClick={() => runBulk("favourite", "Favourited")} disabled={pending}>
            ♥ Favourite
          </BulkButton>
          <BulkButton onClick={() => runBulk("unfavourite", "Updated")} disabled={pending}>
            Unfavourite
          </BulkButton>
          <select
            aria-label="Album for selected photos"
            className="bg-ivory/15 text-ivory rounded-full px-3 py-1.5"
            value={bulkAlbum}
            onChange={(e) => setBulkAlbum(e.target.value)}
          >
            <option value="">Choose album…</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id} className="text-cocoa">
                {a.name}
              </option>
            ))}
          </select>
          <BulkButton onClick={() => runBulk("addToAlbum", "Added")} disabled={pending || !bulkAlbum}>
            Add to album
          </BulkButton>
          <BulkButton onClick={() => runBulk("removeFromAlbum", "Removed")} disabled={pending || !bulkAlbum}>
            Remove from album
          </BulkButton>
          <span className="ml-auto flex items-center gap-2">
            <ConfirmButton
              onConfirm={() => runBulk("delete", "Deleted")}
              className="!border-ivory/40 !text-ivory"
              confirmLabel={`Delete ${selected.size}`}
            >
              Delete
            </ConfirmButton>
            <BulkButton onClick={() => setSelected(new Set())}>Clear</BulkButton>
          </span>
        </div>
      ) : null}

      <div className="text-taupe-dark mb-3 flex items-center justify-between text-xs">
        <span aria-live="polite">
          {loading ? "Loading…" : `${list.total} photo${list.total === 1 ? "" : "s"}`}
          {canReorder && list.photos.length > 1 ? " · drag photos to change their order on the website" : ""}
        </span>
        {list.photos.length ? (
          <button
            type="button"
            className="underline"
            onClick={() =>
              setSelected((s) =>
                s.size === list.photos.length ? new Set() : new Set(list.photos.map((p) => p.id)),
              )
            }
          >
            {selected.size === list.photos.length ? "Select none" : "Select all shown"}
          </button>
        ) : null}
      </div>

      {list.photos.length === 0 && !loading ? (
        <EmptyState>No photos here yet. Upload some above — they’ll appear here as drafts.</EmptyState>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8">
          {list.photos.map((photo) => {
            const isSelected = selected.has(photo.id);
            return (
              <li
                key={photo.id}
                draggable={canReorder}
                onDragStart={() => (dragId.current = photo.id)}
                onDragOver={(e) => canReorder && e.preventDefault()}
                onDrop={() => onDrop(photo.id)}
                className={cn("group relative", canReorder && "cursor-grab")}
              >
                <button
                  type="button"
                  onClick={() => setEditing(photo)}
                  className={cn(
                    "ring-offset-ivory block w-full overflow-hidden rounded-xl ring-offset-2 transition",
                    isSelected ? "ring-cocoa ring-2" : "hover:ring-taupe hover:ring-2",
                  )}
                  aria-label={`Edit ${photo.caption ?? photo.originalFilename ?? "photo"}`}
                >
                  <Thumb photo={photo} className="aspect-square" />
                </button>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(photo.id)}
                  aria-label="Select photo"
                  className="accent-cocoa absolute top-2 left-2 h-5 w-5"
                />
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex gap-1">
                  {!photo.published ? (
                    <span className="bg-ivory/90 text-cocoa rounded-full px-1.5 text-[10px]">Draft</span>
                  ) : null}
                  {photo.isFavourite ? (
                    <span className="bg-ivory/90 rounded-full px-1.5 text-[10px]">♥</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {list.hasMore ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loading}
            onClick={() => load(list.photos.length)}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}

      <Drawer open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit photo" wide>
        {editing ? (
          <PhotoEditor
            key={editing.id}
            photo={editing}
            albums={albums}
            hero={hero}
            onSaved={async () => {
              setEditing(null);
              await reload();
            }}
            onMoveToTop={() => moveToTop(editing)}
            canReorder={canReorder}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

function BulkButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="bg-ivory/15 hover:bg-ivory/25 rounded-full px-3 py-1.5 disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

function PhotoEditor({
  photo,
  albums,
  hero,
  onSaved,
  onMoveToTop,
  canReorder,
}: {
  photo: AdminPhoto;
  albums: Album[];
  hero: HeroSettings;
  onSaved: () => void;
  onMoveToTop: () => void;
  canReorder: boolean;
}) {
  const [form, setForm] = useState({
    caption: photo.caption ?? "",
    alt: photo.alt ?? "",
    takenOn: photo.takenOn ?? "",
    tags: photo.tags.join(", "),
    isFavourite: photo.isFavourite,
    allowDownload: photo.allowDownload,
    published: photo.published,
    albumIds: photo.albumIds,
  });
  const [pending, startTransition] = useTransition();
  const [replaceProgress, setReplaceProgress] = useState<number | null>(null);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = () =>
    startTransition(async () => {
      const res = await updatePhoto({
        id: photo.id,
        caption: form.caption,
        alt: form.alt,
        takenOn: form.takenOn || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isFavourite: form.isFavourite,
        allowDownload: form.allowDownload,
        published: form.published,
        albumIds: form.albumIds,
      });
      if (report(res, "Photo saved")) onSaved();
    });

  const replace = async (file: File) => {
    try {
      setReplaceProgress(0);
      const asset = await uploadSingle(file, "photo", setReplaceProgress);
      if (report(await replacePhoto({ id: photo.id, asset }), "Photo replaced")) onSaved();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setReplaceProgress(null);
    }
  };

  const setAsHero = () =>
    startTransition(async () => {
      report(
        await saveSettings({ key: "hero", value: { ...hero, photoId: photo.id } }),
        "Set as the homepage photo",
      );
    });

  const remove = () =>
    startTransition(async () => {
      if (report(await bulkUpdatePhotos({ ids: [photo.id], op: "delete" }), "Photo deleted")) onSaved();
    });

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <div>
        <div
          className="bg-cream relative overflow-hidden rounded-xl"
          style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        >
          {isCloudinaryConfigured && photo.publicId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(photo.publicId, { width: 900, version: photo.version })}
              alt={photo.alt ?? photo.caption ?? ""}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : null}
        </div>
        <dl className="text-taupe-dark mt-3 grid grid-cols-2 gap-1 text-xs">
          <dt>File</dt>
          <dd className="truncate">{photo.originalFilename ?? "—"}</dd>
          <dt>Size</dt>
          <dd>
            {photo.width} × {photo.height}
            {photo.bytes ? ` · ${formatBytes(photo.bytes)}` : ""}
          </dd>
          <dt>Status</dt>
          <dd>
            <StatusPill published={photo.published} />
          </dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <label
            className={cn(
              "btn btn-ghost cursor-pointer !px-4 !py-2",
              replaceProgress !== null && "opacity-60",
            )}
          >
            {replaceProgress !== null ? `Replacing… ${Math.round(replaceProgress * 100)}%` : "Replace file"}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              className="sr-only"
              disabled={replaceProgress !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void replace(file);
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost !px-4 !py-2"
            onClick={setAsHero}
            disabled={pending || !photo.published}
          >
            Use as homepage photo
          </button>
          {canReorder ? (
            <button
              type="button"
              className="btn btn-ghost !px-4 !py-2"
              onClick={onMoveToTop}
              disabled={pending}
            >
              Move to top
            </button>
          ) : null}
        </div>
        {!photo.published ? <p className="hint">Publish the photo before using it on the homepage.</p> : null}
      </div>

      <div className="space-y-5">
        <Field label="Caption" hint="Shown under the photo and used for search.">
          {(id) => (
            <textarea
              id={id}
              rows={3}
              className="field"
              value={form.caption}
              maxLength={1000}
              onChange={(e) => set("caption", e.target.value)}
            />
          )}
        </Field>
        <Field label="Date taken (optional)">
          {(id) => (
            <input
              id={id}
              type="date"
              min="2017-03-11"
              className="field"
              value={form.takenOn}
              onChange={(e) => set("takenOn", e.target.value)}
            />
          )}
        </Field>
        <Field label="Tags (optional)" hint="Separate with commas, e.g. beach, birthday, sleepy">
          {(id) => (
            <input
              id={id}
              className="field"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
          )}
        </Field>
        <Field label="Description for screen readers (optional)" hint="If empty, the caption is used.">
          {(id) => (
            <input
              id={id}
              className="field"
              value={form.alt}
              maxLength={300}
              onChange={(e) => set("alt", e.target.value)}
            />
          )}
        </Field>
        <div>
          <p className="label">Albums</p>
          <div className="flex flex-wrap gap-2">
            {albums.map((a) => {
              const on = form.albumIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set("albumIds", on ? form.albumIds.filter((x) => x !== a.id) : [...form.albumIds, a.id])
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-xs",
                    on ? "bg-cocoa text-ivory" : "bg-cream text-cocoa/80",
                  )}
                >
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl bg-white p-4">
          <Toggle
            label="Published"
            description="Visible on the website"
            checked={form.published}
            onChange={(v) => set("published", v)}
          />
          <Toggle
            label="Favourite"
            description="Appears in “Our Favourites” and on the homepage"
            checked={form.isFavourite}
            onChange={(v) => set("isFavourite", v)}
          />
          <Toggle
            label="Allow download"
            description="Only if downloads are switched on in Settings"
            checked={form.allowDownload}
            onChange={(v) => set("allowDownload", v)}
          />
        </div>
        <div className="border-taupe/25 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <ConfirmButton onConfirm={remove} disabled={pending}>
            Delete photo
          </ConfirmButton>
          <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
