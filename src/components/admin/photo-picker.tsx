"use client";

import { useEffect, useState } from "react";
import { listPhotos } from "@/app/admin/actions/media";
import { Thumb } from "@/components/admin/thumb";
import { Drawer } from "@/components/admin/ui";
import { cn } from "@/lib/cn";
import type { AdminPhoto, Photo } from "@/lib/types";

type PickerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
} & (
  | { multiple?: false; onPick: (photo: AdminPhoto) => void; initial?: never }
  | { multiple: true; onPick: (photos: AdminPhoto[]) => void; initial?: Photo[] }
);

/** Browse the photo library and choose one or several photos. */
export function PhotoPicker(props: PickerProps) {
  const { open, onClose, title = "Choose a photo" } = props;
  const [q, setQ] = useState("");
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<AdminPhoto[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await listPhotos({ q, offset: 0, limit: 60 });
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setPhotos(res.data.photos);
        setHasMore(res.data.hasMore);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, q]);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setChosen(props.multiple ? ((props.initial ?? []) as AdminPhoto[]) : []);
  }

  const more = async () => {
    setLoading(true);
    const res = await listPhotos({ q, offset: photos.length, limit: 60 });
    setLoading(false);
    if (res.ok) {
      setPhotos((p) => [...p, ...res.data.photos]);
      setHasMore(res.data.hasMore);
    }
  };

  const toggle = (photo: AdminPhoto) => {
    if (!props.multiple) {
      props.onPick(photo);
      onClose();
      return;
    }
    setChosen((c) => (c.some((x) => x.id === photo.id) ? c.filter((x) => x.id !== photo.id) : [...c, photo]));
  };

  return (
    <Drawer open={open} onClose={onClose} title={title} wide>
      <input
        type="search"
        className="field mb-4"
        placeholder="Search by caption, tag or file name"
        aria-label="Search photos"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {photos.length === 0 && !loading ? (
        <p className="text-taupe-dark py-10 text-center text-sm">
          No photos found. Upload some on the Photos page first.
        </p>
      ) : null}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((photo) => {
          const order = chosen.findIndex((c) => c.id === photo.id);
          return (
            <li key={photo.id} className="relative">
              <button
                type="button"
                onClick={() => toggle(photo)}
                aria-pressed={props.multiple ? order >= 0 : undefined}
                className={cn(
                  "block w-full overflow-hidden rounded-xl",
                  order >= 0 ? "ring-cocoa ring-2 ring-offset-2" : "hover:opacity-85",
                )}
                aria-label={photo.caption ?? photo.originalFilename ?? "Photo"}
              >
                <Thumb photo={photo} className="aspect-square" />
              </button>
              {order >= 0 ? (
                <span className="bg-cocoa text-ivory absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs">
                  {order + 1}
                </span>
              ) : null}
              {!photo.published ? (
                <span className="bg-ivory/90 absolute bottom-1.5 left-1.5 rounded-full px-1.5 text-[10px]">
                  Draft
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <div className="mt-4 text-center">
          <button type="button" className="btn btn-ghost" onClick={more} disabled={loading}>
            Load more
          </button>
        </div>
      ) : null}
      {props.multiple ? (
        <div className="border-taupe/25 bg-ivory sticky bottom-0 -mx-5 mt-6 flex items-center justify-between border-t px-5 py-4">
          <span className="text-cocoa/70 text-sm">{chosen.length} chosen</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              props.onPick(chosen);
              onClose();
            }}
          >
            Use these photos
          </button>
        </div>
      ) : null}
      <p className="hint mt-4">Draft photos only appear on the website once they are published.</p>
    </Drawer>
  );
}

/** A small control showing the chosen photo with Change / Remove buttons. */
export function PhotoField({
  label,
  photo,
  onChange,
  hint,
}: {
  label: string;
  photo: Photo | null;
  onChange: (photo: AdminPhoto | null) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        <Thumb photo={photo} className="h-20 w-20 shrink-0 rounded-xl" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => setOpen(true)}>
            {photo ? "Change photo" : "Choose photo"}
          </button>
          {photo ? (
            <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => onChange(null)}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
      <PhotoPicker open={open} onClose={() => setOpen(false)} onPick={(p) => onChange(p)} />
    </div>
  );
}
