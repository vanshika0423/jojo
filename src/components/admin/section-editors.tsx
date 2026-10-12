"use client";

import { useState, useTransition } from "react";
import {
  deleteLittleThing,
  deleteStorySection,
  moveLittleThing,
  moveStorySection,
  saveLittleThing,
  saveStorySection,
} from "@/app/admin/actions/content";
import { PhotoField } from "@/components/admin/photo-picker";
import { report } from "@/components/admin/toast";
import { Card, ConfirmButton, Field, StatusPill, Toggle } from "@/components/admin/ui";
import type { LittleThing, Photo, StorySection } from "@/lib/types";

type Item = {
  id?: string;
  title: string;
  body: string;
  emoji?: string | null;
  photo: Photo | null;
  published: boolean;
};

type Kind = "story" | "little";

const copy = {
  story: {
    add: "+ Add a chapter",
    bodyLabel: "Story",
    bodyHint: "Leave a blank line between paragraphs. Your words appear exactly as written.",
    rows: 12,
    photoLabel: "Large photograph for this chapter",
  },
  little: {
    add: "+ Add a card",
    bodyLabel: "Answer",
    bodyHint: "A sentence or two is perfect.",
    rows: 4,
    photoLabel: "Photo (optional)",
  },
};

export function StoryEditor({ sections }: { sections: StorySection[] }) {
  return <ItemList kind="story" items={sections} />;
}

export function LittleThingsEditor({ things }: { things: LittleThing[] }) {
  return <ItemList kind="little" items={things} />;
}

function ItemList({ kind, items }: { kind: Kind; items: Array<StorySection | LittleThing> }) {
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const move = kind === "story" ? moveStorySection : moveLittleThing;

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const open = openId === item.id;
        return (
          <Card key={item.id} className="!p-0">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex flex-col">
                <button type="button" aria-label="Move up" disabled={i === 0 || pending} className="px-2 text-cocoa/60 disabled:opacity-20" onClick={() => startTransition(async () => void report(await move({ id: item.id, direction: "up" }), "Order updated"))}>▲</button>
                <button type="button" aria-label="Move down" disabled={i === items.length - 1 || pending} className="px-2 text-cocoa/60 disabled:opacity-20" onClick={() => startTransition(async () => void report(await move({ id: item.id, direction: "down" }), "Order updated"))}>▼</button>
              </div>
              <button type="button" className="min-w-0 flex-1 text-left" aria-expanded={open} onClick={() => setOpenId(open ? null : item.id)}>
                <span className="font-serif text-xl text-cocoa">
                  {"emoji" in item && item.emoji ? `${item.emoji} ` : ""}
                  {item.title}
                </span>
                <span className="block truncate text-xs text-taupe-dark">
                  {item.body ? item.body.slice(0, 120) : "✎ Not written yet"}
                </span>
              </button>
              <StatusPill published={item.published} />
              <span aria-hidden className="text-cocoa/50">{open ? "−" : "+"}</span>
            </div>
            {open ? (
              <div className="border-t border-cream px-4 py-5 sm:px-5">
                <ItemForm kind={kind} item={item} onDone={() => setOpenId(null)} />
              </div>
            ) : null}
          </Card>
        );
      })}
      {adding ? (
        <Card>
          <ItemForm kind={kind} item={null} onDone={() => setAdding(false)} />
        </Card>
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setAdding(true)}>
          {copy[kind].add}
        </button>
      )}
    </div>
  );
}

function ItemForm({ kind, item, onDone }: { kind: Kind; item: Item | null; onDone: () => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [emoji, setEmoji] = useState(item?.emoji ?? "");
  const [photo, setPhoto] = useState<Photo | null>(item?.photo ?? null);
  const [published, setPublished] = useState(item?.published ?? true);
  const [pending, startTransition] = useTransition();
  const c = copy[kind];

  const save = () =>
    startTransition(async () => {
      const base = { id: item?.id, title, body, photoId: photo?.id ?? null, published };
      const res = kind === "story" ? await saveStorySection(base) : await saveLittleThing({ ...base, emoji });
      if (report(res, "Saved")) onDone();
    });

  const remove = () =>
    startTransition(async () => {
      if (!item?.id) return;
      const res = kind === "story" ? await deleteStorySection(item.id) : await deleteLittleThing(item.id);
      if (report(res, "Deleted")) onDone();
    });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Title">{(id) => <input id={id} className="field" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />}</Field>
        {kind === "little" ? (
          <Field label="Emoji">{(id) => <input id={id} className="field text-center text-xl" value={emoji} maxLength={16} onChange={(e) => setEmoji(e.target.value)} />}</Field>
        ) : null}
      </div>
      <Field label={c.bodyLabel} hint={c.bodyHint}>
        {(id) => <textarea id={id} rows={c.rows} className="field font-serif text-lg leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />}
      </Field>
      <PhotoField label={c.photoLabel} photo={photo} onChange={setPhoto} />
      <Toggle label="Show on the website" checked={published} onChange={setPublished} />
      <div className="flex items-center justify-between gap-3">
        {item?.id ? <ConfirmButton onConfirm={remove} disabled={pending}>Delete</ConfirmButton> : <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>}
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending || !title.trim()}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
