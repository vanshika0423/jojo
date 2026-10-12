"use client";

import { useState, useTransition } from "react";
import { deleteTimelineEvent, saveTimelineEvent } from "@/app/admin/actions/content";
import { PhotoPicker } from "@/components/admin/photo-picker";
import { Thumb } from "@/components/admin/thumb";
import { report } from "@/components/admin/toast";
import { Card, ConfirmButton, Drawer, EmptyState, Field, StatusPill, Toggle } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DatePrecision, Photo, TimelineEvent, Video } from "@/lib/types";

export function TimelineEditor({ events, videos }: { events: TimelineEvent[]; videos: Video[] }) {
  const [editing, setEditing] = useState<TimelineEvent | "new" | null>(null);
  return (
    <>
      <div className="mb-5">
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          + Add a milestone
        </button>
      </div>
      {events.length === 0 ? (
        <EmptyState>No milestones yet.</EmptyState>
      ) : (
        <Card>
          <ol className="divide-cream divide-y">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-4 py-3">
                <span className="text-taupe-dark w-32 shrink-0 text-xs tracking-wider uppercase">
                  {formatDate(e.eventDate, e.datePrecision)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-cocoa block truncate font-serif text-xl">{e.title}</span>
                  <span className="text-taupe-dark text-xs">
                    {e.media.length} photo/video{e.media.length === 1 ? "" : "s"}
                  </span>
                </span>
                <StatusPill published={e.published} />
                <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => setEditing(e)}>
                  Edit
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New milestone" : "Edit milestone"}
        wide
      >
        {editing ? (
          <EventForm
            key={editing === "new" ? "new" : editing.id}
            event={editing === "new" ? null : editing}
            videos={videos}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Drawer>
    </>
  );
}

function EventForm({
  event,
  videos,
  onDone,
}: {
  event: TimelineEvent | null;
  videos: Video[];
  onDone: () => void;
}) {
  const [eventDate, setEventDate] = useState(event?.eventDate ?? "");
  const [precision, setPrecision] = useState<DatePrecision>(event?.datePrecision ?? "day");
  const [title, setTitle] = useState(event?.title ?? "");
  const [story, setStory] = useState(event?.story ?? "");
  const [published, setPublished] = useState(event?.published ?? false);
  const [photos, setPhotos] = useState<Photo[]>(
    event?.media.flatMap((m) => (m.kind === "photo" ? [m.photo] : [])) ?? [],
  );
  const [videoIds, setVideoIds] = useState<string[]>(
    event?.media.flatMap((m) => (m.kind === "video" ? [m.video.id] : [])) ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveTimelineEvent({
        id: event?.id,
        eventDate,
        datePrecision: precision,
        title,
        story,
        published,
        media: [
          ...photos.map((p) => ({ kind: "photo" as const, id: p.id })),
          ...videoIds.map((id) => ({ kind: "video" as const, id })),
        ],
      });
      if (report(res, "Milestone saved")) onDone();
    });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" hint="If you only know the month or year, pick any day in it and choose below.">
          {(id) => (
            <input
              id={id}
              type="date"
              min="2017-03-01"
              className="field"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          )}
        </Field>
        <Field label="Show the date as">
          {(id) => (
            <select
              id={id}
              className="field"
              value={precision}
              onChange={(e) => setPrecision(e.target.value as DatePrecision)}
            >
              <option value="day">Exact day (11 March 2017)</option>
              <option value="month">Month only (March 2017)</option>
              <option value="year">Year only (2017)</option>
            </select>
          )}
        </Field>
      </div>
      <Field label="Title">
        {(id) => (
          <input
            id={id}
            className="field"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>
      <Field label="Story" hint="Leave a blank line between paragraphs.">
        {(id) => (
          <textarea
            id={id}
            rows={8}
            className="field font-serif text-lg leading-relaxed"
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />
        )}
      </Field>
      <div>
        <p className="label">Photographs</p>
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((p) => (
            <Thumb key={p.id} photo={p} className="h-16 w-16 rounded-lg" />
          ))}
          <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => setPicking(true)}>
            {photos.length ? "Change photos" : "Choose photos"}
          </button>
        </div>
      </div>
      {videos.length ? (
        <div>
          <p className="label">Videos</p>
          <div className="flex flex-wrap gap-2">
            {videos.map((v) => {
              const on = videoIds.includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setVideoIds((ids) => (on ? ids.filter((x) => x !== v.id) : [...ids, v.id]))}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs",
                    on ? "bg-cocoa text-ivory" : "bg-cream text-cocoa/80",
                  )}
                >
                  ▶ {v.title ?? "Untitled video"}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <Toggle
        label="Published"
        description="Visible on the Timeline page"
        checked={published}
        onChange={setPublished}
      />
      <div className="border-taupe/25 flex items-center justify-between border-t pt-5">
        {event ? (
          <ConfirmButton
            disabled={pending}
            onConfirm={() =>
              startTransition(async () => {
                if (report(await deleteTimelineEvent(event.id), "Milestone deleted")) onDone();
              })
            }
          >
            Delete milestone
          </ConfirmButton>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={pending || !title.trim() || !eventDate}
        >
          {pending ? "Saving…" : "Save milestone"}
        </button>
      </div>
      <PhotoPicker
        multiple
        open={picking}
        onClose={() => setPicking(false)}
        title="Choose photos for this milestone"
        initial={photos}
        onPick={setPhotos}
      />
    </div>
  );
}
