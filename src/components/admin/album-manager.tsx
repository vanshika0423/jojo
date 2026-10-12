"use client";

import { useState, useTransition } from "react";
import { deleteAlbum, moveAlbum, saveAlbum } from "@/app/admin/actions/content";
import { PhotoField } from "@/components/admin/photo-picker";
import { report } from "@/components/admin/toast";
import { Card, ConfirmButton, Drawer, EmptyState, Field, StatusPill, Toggle } from "@/components/admin/ui";
import type { Album, Photo } from "@/lib/types";

type AdminAlbum = Album & { photoCount: number; cover?: Photo | null };

export function AlbumManager({ albums }: { albums: AdminAlbum[] }) {
  const [editing, setEditing] = useState<AdminAlbum | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const move = (id: string, direction: "up" | "down") =>
    startTransition(async () => {
      report(await moveAlbum({ id, direction }), "Order updated");
    });

  return (
    <>
      <div className="mb-5">
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          + New album
        </button>
      </div>
      <Card>
        <p className="mb-4 text-sm text-cocoa/70">
          “All Memories” and “Our Favourites” are always shown in the gallery automatically. Deleting an album never
          deletes its photos.
        </p>
        {albums.length === 0 ? (
          <EmptyState>No albums yet.</EmptyState>
        ) : (
          <ol className="divide-y divide-cream">
            {albums.map((album, i) => (
              <li key={album.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${album.name} up`}
                    className="px-2 text-cocoa/60 hover:text-cocoa disabled:opacity-20"
                    disabled={i === 0 || pending}
                    onClick={() => move(album.id, "up")}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${album.name} down`}
                    className="px-2 text-cocoa/60 hover:text-cocoa disabled:opacity-20"
                    disabled={i === albums.length - 1 || pending}
                    onClick={() => move(album.id, "down")}
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-xl text-cocoa">{album.name}</p>
                  <p className="text-xs text-taupe-dark">
                    {album.photoCount} photo{album.photoCount === 1 ? "" : "s"} · /memories?album={album.slug}
                  </p>
                </div>
                <StatusPill published={album.published} />
                <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => setEditing(album)}>
                  Edit
                </button>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New album" : "Edit album"}>
        {editing ? (
          <AlbumForm key={editing === "new" ? "new" : editing.id} album={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        ) : null}
      </Drawer>
    </>
  );
}

function AlbumForm({ album, onDone }: { album: AdminAlbum | null; onDone: () => void }) {
  const [name, setName] = useState(album?.name ?? "");
  const [description, setDescription] = useState(album?.description ?? "");
  const [published, setPublished] = useState(album?.published ?? true);
  const [cover, setCover] = useState<Photo | null>(album?.cover ?? null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveAlbum({
        id: album?.id,
        name,
        description,
        published,
        coverPhotoId: cover?.id ?? null,
      });
      if (report(res, album ? "Album saved" : "Album created")) onDone();
    });

  const remove = () =>
    startTransition(async () => {
      if (album && report(await deleteAlbum(album.id), "Album deleted")) onDone();
    });

  return (
    <div className="space-y-5">
      <Field label="Album name">
        {(id) => <input id={id} className="field" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Description (optional)">
        {(id) => (
          <textarea id={id} rows={3} className="field" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
        )}
      </Field>
      <PhotoField label="Cover photo (optional)" photo={cover} onChange={setCover} />
      <Toggle label="Show in the gallery" checked={published} onChange={setPublished} />
      <div className="flex items-center justify-between border-t border-taupe/25 pt-5">
        {album ? (
          <ConfirmButton onConfirm={remove} disabled={pending}>
            Delete album
          </ConfirmButton>
        ) : (
          <span />
        )}
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending || !name.trim()}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
