"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { TAGS } from "@/lib/data/tags";
import { slugify } from "@/lib/format";
import { settingsSchemas } from "@/lib/settings";
import { UserFacingError, check, isoDate, optionalText, runAdmin, uuid } from "./run";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type OrderedTable = "albums" | "story_sections" | "little_things";

async function uniqueSlug(supabase: SupabaseClient, table: OrderedTable, base: string, exceptId?: string) {
  const root = slugify(base) || "item";
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    let query = supabase.from(table).select("id").eq("slug", slug);
    if (exceptId) query = query.neq("id", exceptId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
  }
  throw new UserFacingError("Please choose a more distinctive name.");
}

async function nextPosition(supabase: SupabaseClient, table: OrderedTable) {
  const { data } = await supabase
    .from(table)
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}

/** Swap an item with its neighbour, renumbering the whole (short) list. */
async function moveInList(
  supabase: SupabaseClient,
  table: OrderedTable,
  id: string,
  direction: "up" | "down",
) {
  const rows = check(await supabase.from(table).select("id").order("position").order("created_at"), table);
  const i = rows.findIndex((r) => r.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(
    order.map((rid, n) =>
      supabase
        .from(table)
        .update({ position: n + 1 })
        .eq("id", rid)
        .then((r) => check(r, table)),
    ),
  );
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
  return runAdmin(albumSchema, input, [TAGS.albums, TAGS.photos, TAGS.videos], async (a, supabase) => {
    const slug = await uniqueSlug(supabase, "albums", a.name, a.id);
    const values = {
      name: a.name,
      slug,
      description: a.description,
      published: a.published,
      cover_photo_id: a.coverPhotoId,
    };
    if (a.id) {
      check(await supabase.from("albums").update(values).eq("id", a.id), "album");
    } else {
      check(
        await supabase.from("albums").insert({ ...values, position: await nextPosition(supabase, "albums") }),
        "album",
      );
    }
  });
}

export async function moveAlbum(input: z.input<typeof moveSchema>) {
  return runAdmin(moveSchema, input, [TAGS.albums], ({ id, direction }, supabase) =>
    moveInList(supabase, "albums", id, direction),
  );
}

/** Deleting an album never deletes its photos — they stay in All Memories. */
export async function deleteAlbum(id: string) {
  return runAdmin(uuid, id, [TAGS.albums, TAGS.photos, TAGS.videos], async (albumId, supabase) => {
    check(await supabase.from("albums").delete().eq("id", albumId), "album");
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
  return runAdmin(storySchema, input, [TAGS.story], async (s, supabase) => {
    const values = { title: s.title, body: s.body, photo_id: s.photoId, published: s.published };
    if (s.id) {
      check(await supabase.from("story_sections").update(values).eq("id", s.id), "chapter");
    } else {
      check(
        await supabase.from("story_sections").insert({
          ...values,
          slug: await uniqueSlug(supabase, "story_sections", s.title),
          position: await nextPosition(supabase, "story_sections"),
        }),
        "chapter",
      );
    }
  });
}

export async function moveStorySection(input: z.input<typeof moveSchema>) {
  return runAdmin(moveSchema, input, [TAGS.story], ({ id, direction }, supabase) =>
    moveInList(supabase, "story_sections", id, direction),
  );
}

export async function deleteStorySection(id: string) {
  return runAdmin(uuid, id, [TAGS.story], async (sid, supabase) => {
    check(await supabase.from("story_sections").delete().eq("id", sid), "chapter");
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
  return runAdmin(littleThingSchema, input, [TAGS.littleThings], async (t, supabase) => {
    const values = {
      title: t.title,
      body: t.body,
      emoji: t.emoji,
      photo_id: t.photoId,
      published: t.published,
    };
    if (t.id) {
      check(await supabase.from("little_things").update(values).eq("id", t.id), "card");
    } else {
      check(
        await supabase.from("little_things").insert({
          ...values,
          slug: await uniqueSlug(supabase, "little_things", t.title),
          position: await nextPosition(supabase, "little_things"),
        }),
        "card",
      );
    }
  });
}

export async function moveLittleThing(input: z.input<typeof moveSchema>) {
  return runAdmin(moveSchema, input, [TAGS.littleThings], ({ id, direction }, supabase) =>
    moveInList(supabase, "little_things", id, direction),
  );
}

export async function deleteLittleThing(id: string) {
  return runAdmin(uuid, id, [TAGS.littleThings], async (tid, supabase) => {
    check(await supabase.from("little_things").delete().eq("id", tid), "card");
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
  return runAdmin(timelineSchema, input, [TAGS.timeline], async (e, supabase) => {
    const values = {
      event_date: e.eventDate,
      date_precision: e.datePrecision,
      title: e.title,
      story: e.story,
      published: e.published,
    };
    let id = e.id;
    if (id) {
      check(await supabase.from("timeline_events").update(values).eq("id", id), "milestone");
    } else {
      id = check(await supabase.from("timeline_events").insert(values).select("id").single(), "milestone").id;
    }
    check(await supabase.from("timeline_event_media").delete().eq("event_id", id), "milestone media");
    if (e.media.length) {
      check(
        await supabase.from("timeline_event_media").insert(
          e.media.map((m, position) => ({
            event_id: id,
            position,
            photo_id: m.kind === "photo" ? m.id : null,
            video_id: m.kind === "video" ? m.id : null,
          })),
        ),
        "milestone media",
      );
    }
  });
}

export async function deleteTimelineEvent(id: string) {
  return runAdmin(uuid, id, [TAGS.timeline], async (eid, supabase) => {
    check(await supabase.from("timeline_events").delete().eq("id", eid), "milestone");
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
  return runAdmin(letterSchema, input, [TAGS.letters], async (l, supabase) => {
    const values = {
      author_name: l.authorName,
      body: l.body,
      letter_date: l.letterDate,
      visibility: l.visibility,
      status: l.status,
      photo_id: l.photoId,
      approved_at: l.status === "approved" ? new Date().toISOString() : null,
    };
    if (l.id) check(await supabase.from("letters").update(values).eq("id", l.id), "letter");
    else check(await supabase.from("letters").insert({ ...values, written_by_admin: true }), "letter");
  });
}

const letterStatusSchema = z.object({
  id: uuid,
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export async function setLetterStatus(input: z.input<typeof letterStatusSchema>) {
  return runAdmin(letterStatusSchema, input, [TAGS.letters], async ({ id, status, visibility }, supabase) => {
    const values: Record<string, unknown> = {};
    if (status) {
      values.status = status;
      values.approved_at = status === "approved" ? new Date().toISOString() : null;
    }
    if (visibility) values.visibility = visibility;
    check(await supabase.from("letters").update(values).eq("id", id), "letter");
  });
}

export async function deleteLetter(id: string) {
  return runAdmin(uuid, id, [TAGS.letters], async (lid, supabase) => {
    check(await supabase.from("letters").delete().eq("id", lid), "letter");
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
  return runAdmin(settingsInput, input, [TAGS.settings, TAGS.letters], async ({ key, value }, supabase) => {
    check(await supabase.from("site_settings").upsert({ key, value }, { onConflict: "key" }), "setting");
  });
}
