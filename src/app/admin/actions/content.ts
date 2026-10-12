"use server";

import { z } from "zod";
import { TAGS } from "@/lib/data/tags";
import type { Sql } from "@/lib/db";
import { slugify } from "@/lib/format";
import { settingsSchemas } from "@/lib/settings";
import { UserFacingError, isoDate, optionalText, runAdmin, uuid } from "./run";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type OrderedTable = "albums" | "story_sections" | "little_things";

async function uniqueSlug(sql: Sql, table: OrderedTable, base: string, exceptId?: string) {
  const root = slugify(base) || "item";
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const [taken] = await sql`
      select 1 from ${sql(table)} where slug = ${slug} ${exceptId ? sql`and id <> ${exceptId}` : sql``}`;
    if (!taken) return slug;
  }
  throw new UserFacingError("Please choose a more distinctive name.");
}

async function nextPosition(sql: Sql, table: OrderedTable) {
  const [row] = await sql<{ top: number | null }[]>`select max(position) as top from ${sql(table)}`;
  return (row?.top ?? 0) + 1;
}

/** Swap an item with its neighbour, renumbering the whole (short) list. */
async function moveInList(sql: Sql, table: OrderedTable, id: string, direction: "up" | "down") {
  const rows = await sql<{ id: string }[]>`select id from ${sql(table)} order by position, created_at`;
  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [n, rid] of order.entries()) {
    await sql`update ${sql(table)} set position = ${n + 1} where id = ${rid}`;
  }
}

const moveSchema = z.object({ id: uuid, direction: z.enum(["up", "down"]) });

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

const albumSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Give the album a name").max(80),
  description: optionalText(500),
  published: z.boolean(),
  coverPhotoId: uuid.nullable(),
});

export async function saveAlbum(input: z.input<typeof albumSchema>) {
  return runAdmin(albumSchema, input, [TAGS.albums, TAGS.photos, TAGS.videos], async (a, sql) => {
    const values = {
      name: a.name,
      slug: await uniqueSlug(sql, "albums", a.name, a.id),
      description: a.description,
      published: a.published,
      cover_photo_id: a.coverPhotoId,
    };
    if (a.id) {
      await sql`update public.albums set ${sql(values)} where id = ${a.id}`;
    } else {
      await sql`insert into public.albums ${sql({ ...values, position: await nextPosition(sql, "albums") })}`;
    }
  });
}

export async function moveAlbum(input: z.input<typeof moveSchema>) {
  return runAdmin(moveSchema, input, [TAGS.albums], ({ id, direction }, sql) =>
    moveInList(sql, "albums", id, direction),
  );
}

/** Deleting an album never deletes its photos — they stay in All Memories. */
export async function deleteAlbum(id: string) {
  return runAdmin(uuid, id, [TAGS.albums, TAGS.photos, TAGS.videos], async (albumId, sql) => {
    await sql`delete from public.albums where id = ${albumId}`;
  });
}

// ---------------------------------------------------------------------------
// Story sections & little things
// ---------------------------------------------------------------------------

const storySchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1, "Add a title").max(200),
  body: z.string().trim().max(30_000),
  photoId: uuid.nullable(),
  published: z.boolean(),
});

export async function saveStorySection(input: z.input<typeof storySchema>) {
  return runAdmin(storySchema, input, [TAGS.story], async (s, sql) => {
    const values = { title: s.title, body: s.body, photo_id: s.photoId, published: s.published };
    if (s.id) {
      await sql`update public.story_sections set ${sql(values)} where id = ${s.id}`;
    } else {
      await sql`insert into public.story_sections ${sql({
        ...values,
        slug: await uniqueSlug(sql, "story_sections", s.title),
        position: await nextPosition(sql, "story_sections"),
      })}`;
    }
  });
}

export async function moveStorySection(input: z.input<typeof moveSchema>) {
  return runAdmin(moveSchema, input, [TAGS.story], ({ id, direction }, sql) =>
    moveInList(sql, "story_sections", id, direction),
  );
}

export async function deleteStorySection(id: string) {
  return runAdmin(uuid, id, [TAGS.story], async (sid, sql) => {
    await sql`delete from public.story_sections where id = ${sid}`;
  });
}

const littleThingSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1, "Add a title").max(120),
  body: z.string().trim().max(4000),
  emoji: optionalText(16),
  photoId: uuid.nullable(),
  published: z.boolean(),
});

export async function saveLittleThing(input: z.input<typeof littleThingSchema>) {
  return runAdmin(littleThingSchema, input, [TAGS.littleThings], async (t, sql) => {
    const values = {
      title: t.title,
      body: t.body,
      emoji: t.emoji,
      photo_id: t.photoId,
      published: t.published,
    };
    if (t.id) {
      await sql`update public.little_things set ${sql(values)} where id = ${t.id}`;
    } else {
      await sql`insert into public.little_things ${sql({
        ...values,
        slug: await uniqueSlug(sql, "little_things", t.title),
        position: await nextPosition(sql, "little_things"),
      })}`;
    }
  });
}

export async function moveLittleThing(input: z.input<typeof moveSchema>) {
  return runAdmin(moveSchema, input, [TAGS.littleThings], ({ id, direction }, sql) =>
    moveInList(sql, "little_things", id, direction),
  );
}

export async function deleteLittleThing(id: string) {
  return runAdmin(uuid, id, [TAGS.littleThings], async (tid, sql) => {
    await sql`delete from public.little_things where id = ${tid}`;
  });
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

const timelineSchema = z.object({
  id: uuid.optional(),
  eventDate: isoDate.refine((d) => d >= "2017-03-01", "Jojo’s timeline begins in March 2017"),
  datePrecision: z.enum(["day", "month", "year"]),
  title: z.string().trim().min(1, "Add a title").max(200),
  story: optionalText(20_000),
  published: z.boolean(),
  media: z.array(z.object({ kind: z.enum(["photo", "video"]), id: uuid })).max(40),
});

export async function saveTimelineEvent(input: z.input<typeof timelineSchema>) {
  return runAdmin(timelineSchema, input, [TAGS.timeline], async (e, sql) => {
    const values = {
      event_date: e.eventDate,
      date_precision: e.datePrecision,
      title: e.title,
      story: e.story,
      published: e.published,
    };
    let id = e.id;
    if (id) {
      await sql`update public.timeline_events set ${sql(values)} where id = ${id}`;
    } else {
      [{ id }] = await sql<{ id: string }[]>`insert into public.timeline_events ${sql(values)} returning id`;
    }
    await sql`delete from public.timeline_event_media where event_id = ${id!}`;
    if (e.media.length) {
      await sql`insert into public.timeline_event_media ${sql(
        e.media.map((m, position) => ({
          event_id: id!,
          position,
          photo_id: m.kind === "photo" ? m.id : null,
          video_id: m.kind === "video" ? m.id : null,
        })),
      )}`;
    }
  });
}

export async function deleteTimelineEvent(id: string) {
  return runAdmin(uuid, id, [TAGS.timeline], async (eid, sql) => {
    await sql`delete from public.timeline_events where id = ${eid}`;
  });
}

// ---------------------------------------------------------------------------
// Letters
// ---------------------------------------------------------------------------

const letterSchema = z.object({
  id: uuid.optional(),
  authorName: z.string().trim().min(1, "Add the author’s name").max(100),
  body: z.string().trim().min(1, "Write the letter").max(10_000),
  letterDate: isoDate,
  visibility: z.enum(["public", "private"]),
  status: z.enum(["pending", "approved", "rejected"]),
  photoId: uuid.nullable(),
});

export async function saveLetter(input: z.input<typeof letterSchema>) {
  return runAdmin(letterSchema, input, [TAGS.letters], async (l, sql) => {
    const values = {
      author_name: l.authorName,
      body: l.body,
      letter_date: l.letterDate,
      visibility: l.visibility,
      status: l.status,
      photo_id: l.photoId,
      approved_at: l.status === "approved" ? new Date() : null,
    };
    if (l.id) await sql`update public.letters set ${sql(values)} where id = ${l.id}`;
    else await sql`insert into public.letters ${sql({ ...values, written_by_admin: true })}`;
  });
}

const letterStatusSchema = z.object({
  id: uuid,
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export async function setLetterStatus(input: z.input<typeof letterStatusSchema>) {
  return runAdmin(letterStatusSchema, input, [TAGS.letters], async ({ id, status, visibility }, sql) => {
    const values: Record<string, string | Date | null> = {};
    if (status) {
      values.status = status;
      values.approved_at = status === "approved" ? new Date() : null;
    }
    if (visibility) values.visibility = visibility;
    if (Object.keys(values).length) await sql`update public.letters set ${sql(values)} where id = ${id}`;
  });
}

export async function deleteLetter(id: string) {
  return runAdmin(uuid, id, [TAGS.letters], async (lid, sql) => {
    await sql`delete from public.letters where id = ${lid}`;
  });
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

const settingsInput = z.discriminatedUnion("key", [
  z.object({ key: z.literal("hero"), value: settingsSchemas.hero }),
  z.object({ key: z.literal("home"), value: settingsSchemas.home }),
  z.object({ key: z.literal("features"), value: settingsSchemas.features }),
]);

export async function saveSettings(input: z.input<typeof settingsInput>) {
  return runAdmin(settingsInput, input, [TAGS.settings, TAGS.letters], async ({ key, value }, sql) => {
    await sql`
      insert into public.site_settings (key, value) values (${key}, ${sql.json(value)})
      on conflict (key) do update set value = excluded.value`;
  });
}
