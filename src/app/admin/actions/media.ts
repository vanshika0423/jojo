"use server";

import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { listAdminPhotos, type AdminPhotoQuery } from "@/lib/data/admin";
import { TAGS } from "@/lib/data/tags";
import type { Sql } from "@/lib/db";
import {
  StorageVerificationError,
  deleteBlobs,
  isValidKey,
  verifyBlob,
  type MediaKind,
} from "@/lib/storage/blob";
import type { ActionResult, AdminPhoto } from "@/lib/types";
import { UserFacingError, isoDate, optionalText, runAdmin, uuid } from "./run";

// ---------------------------------------------------------------------------
// Uploads: verify every file really is in our Blob store, in its own folder
// ---------------------------------------------------------------------------

const blobUrl = z.url({ protocol: /^https$/ }).max(1000);

const photoUpload = z.object({
  key: z.string().max(200),
  originalUrl: blobUrl,
  contentType: z.string().max(100),
  variants: z
    .array(z.object({ w: z.number().int().min(16).max(8000), url: blobUrl }))
    .min(1)
    .max(8),
  width: z.number().int().positive().max(100_000),
  height: z.number().int().positive().max(100_000),
  originalFilename: z.string().max(300),
});

const videoUpload = z.object({
  key: z.string().max(200),
  videoUrl: blobUrl,
  contentType: z.string().max(100),
  posterUrl: blobUrl.nullable(),
  width: z.number().int().positive().max(100_000).nullable(),
  height: z.number().int().positive().max(100_000).nullable(),
  duration: z.number().nonnegative().max(1_000_000).nullable(),
  originalFilename: z.string().max(300),
});

/** Checks each URL; returns their sizes in the same order (nulls skipped). */
async function verifyAll(key: string, kind: MediaKind, urls: Array<string | null>) {
  if (!isValidKey(key, kind))
    throw new UserFacingError("That upload couldn’t be verified. Please try again.");
  try {
    return await Promise.all(urls.filter((u): u is string => Boolean(u)).map((u) => verifyBlob(u, key)));
  } catch (error) {
    if (error instanceof StorageVerificationError) throw new UserFacingError(error.message);
    throw error;
  }
}

async function topPosition(sql: Sql, table: "photos" | "videos") {
  const [row] = await sql<{ top: number | null }[]>`select min(position) as top from ${sql(table)}`;
  return row?.top != null ? Number(row.top) : 0;
}

const recordPhotosSchema = z.object({
  uploads: z.array(photoUpload).min(1).max(50),
  publish: z.boolean(),
  albumIds: z.array(uuid).max(50),
});

/** Save freshly uploaded photos. They stay unpublished unless `publish` was chosen. */
export async function recordPhotoUploads(input: z.input<typeof recordPhotosSchema>) {
  return runAdmin(
    recordPhotosSchema,
    input,
    [TAGS.photos, TAGS.albums],
    async ({ uploads, publish, albumIds }, sql) => {
      const top = await topPosition(sql, "photos");
      const rows = [];
      for (const [i, u] of uploads.entries()) {
        const [original] = await verifyAll(u.key, "photos", [u.originalUrl, ...u.variants.map((v) => v.url)]);
        rows.push({
          storage_key: u.key,
          original_url: u.originalUrl,
          variants: sql.json(u.variants),
          content_type: u.contentType,
          width: u.width,
          height: u.height,
          bytes: original.size,
          original_filename: u.originalFilename || null,
          published: publish,
          position: top - (uploads.length - i),
        });
      }
      const inserted = await sql<{ id: string }[]>`
        insert into public.photos ${sql(rows)}
        on conflict (storage_key) do nothing
        returning id`;
      if (albumIds.length && inserted.length) {
        const links = inserted.flatMap((p) => albumIds.map((album_id) => ({ photo_id: p.id, album_id })));
        await sql`insert into public.photo_albums ${sql(links)} on conflict do nothing`;
      }
      return inserted.length;
    },
  );
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

const listSchema = z.object({
  filter: z.enum(["all", "published", "draft", "favourites"]).default("all"),
  albumId: uuid.nullable().optional(),
  q: z.string().max(100).nullable().optional(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(120).default(60),
});

export async function listPhotos(
  input: AdminPhotoQuery,
): Promise<ActionResult<{ photos: AdminPhoto[]; total: number; hasMore: boolean }>> {
  try {
    await assertAdmin();
    const parsed = listSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid filter" };
    return { ok: true, data: await listAdminPhotos(parsed.data) };
  } catch (error) {
    console.error("[admin] listPhotos", error);
    return { ok: false, error: "Couldn’t load photos." };
  }
}

const tagList = z
  .array(z.string().trim().toLowerCase().max(40))
  .max(30)
  .transform((tags) => [...new Set(tags.map((t) => t.replace(/\s+/g, "-")).filter(Boolean))]);

const updatePhotoSchema = z.object({
  id: uuid,
  caption: optionalText(1000),
  alt: optionalText(300),
  takenOn: isoDate.nullable(),
  tags: tagList,
  isFavourite: z.boolean(),
  allowDownload: z.boolean(),
  published: z.boolean(),
  albumIds: z.array(uuid).max(50),
});

export async function updatePhoto(input: z.input<typeof updatePhotoSchema>) {
  return runAdmin(updatePhotoSchema, input, [TAGS.photos, TAGS.albums, TAGS.settings], async (p, sql) => {
    await sql`
      update public.photos set
        caption = ${p.caption}, alt = ${p.alt}, taken_on = ${p.takenOn}, tags = ${sql.array(p.tags)}::text[],
        is_favourite = ${p.isFavourite}, allow_download = ${p.allowDownload}, published = ${p.published}
      where id = ${p.id}`;
    await sql`delete from public.photo_albums where photo_id = ${p.id}`;
    if (p.albumIds.length) {
      await sql`insert into public.photo_albums ${sql(p.albumIds.map((album_id) => ({ photo_id: p.id, album_id })))}`;
    }
  });
}

type PhotoFilesRow = { original_url: string; variants: Array<{ url: string }> | null };

/** Every file belonging to a photo row, for deletion. */
function photoFiles(row: PhotoFilesRow) {
  return [row.original_url, ...(row.variants ?? []).map((v) => v.url)];
}

const bulkSchema = z.object({
  ids: z.array(uuid).min(1).max(500),
  op: z.enum([
    "publish",
    "unpublish",
    "favourite",
    "unfavourite",
    "allowDownload",
    "disallowDownload",
    "addToAlbum",
    "removeFromAlbum",
    "delete",
  ]),
  albumId: uuid.optional(),
});

export async function bulkUpdatePhotos(input: z.input<typeof bulkSchema>) {
  return runAdmin(
    bulkSchema,
    input,
    [TAGS.photos, TAGS.albums, TAGS.settings, TAGS.story, TAGS.littleThings, TAGS.timeline, TAGS.letters],
    async ({ ids, op, albumId }, sql, afterCommit) => {
      const flags = {
        publish: ["published", true],
        unpublish: ["published", false],
        favourite: ["is_favourite", true],
        unfavourite: ["is_favourite", false],
        allowDownload: ["allow_download", true],
        disallowDownload: ["allow_download", false],
      } as const;
      if (op in flags) {
        const [column, value] = flags[op as keyof typeof flags];
        await sql`update public.photos set ${sql({ [column]: value })} where id in ${sql(ids)}`;
        return;
      }
      if (op === "addToAlbum" || op === "removeFromAlbum") {
        if (!albumId) throw new UserFacingError("Choose an album first.");
        if (op === "addToAlbum") {
          await sql`
            insert into public.photo_albums ${sql(ids.map((photo_id) => ({ photo_id, album_id: albumId })))}
            on conflict do nothing`;
        } else {
          await sql`delete from public.photo_albums where album_id = ${albumId} and photo_id in ${sql(ids)}`;
        }
        return;
      }
      // delete: remove rows now, files once the change is committed
      const removed = await sql<PhotoFilesRow[]>`
        delete from public.photos where id in ${sql(ids)} returning original_url, variants`;
      afterCommit(() => deleteBlobs(removed.flatMap(photoFiles)));
    },
  );
}

const moveSchema = z.object({
  id: uuid,
  /** The photo it should now come after (null = very top). */
  afterId: uuid.nullable(),
  /** The photo it should now come before (null = very end). */
  beforeId: uuid.nullable(),
});

/** Fractional reordering: only the moved photo's row changes. */
export async function movePhoto(input: z.input<typeof moveSchema>) {
  return runAdmin(moveSchema, input, [TAGS.photos], async ({ id, afterId, beforeId }, sql) => {
    const ids = [afterId, beforeId].filter((x): x is string => Boolean(x));
    const neighbours = ids.length
      ? await sql<{ id: string; position: number }[]>`
          select id, position from public.photos where id in ${sql(ids)}`
      : [];
    const pos = (nid: string | null) => {
      const n = neighbours.find((x) => x.id === nid);
      return n ? Number(n.position) : null;
    };
    const after = pos(afterId);
    const before = pos(beforeId);
    let position: number;
    if (after !== null && before !== null) position = (after + before) / 2;
    else if (after !== null) position = after + 1;
    else if (before !== null) position = before - 1;
    else position = (await topPosition(sql, "photos")) - 1;
    await sql`update public.photos set position = ${position} where id = ${id}`;
  });
}

const replaceSchema = z.object({ id: uuid, upload: photoUpload });

/** Swap the image file but keep caption, albums, order and links. */
export async function replacePhoto(input: z.input<typeof replaceSchema>) {
  return runAdmin(
    replaceSchema,
    input,
    [TAGS.photos, TAGS.settings, TAGS.story, TAGS.littleThings, TAGS.timeline, TAGS.letters],
    async ({ id, upload: u }, sql, afterCommit) => {
      const [original] = await verifyAll(u.key, "photos", [u.originalUrl, ...u.variants.map((v) => v.url)]);
      const [old] = await sql<
        PhotoFilesRow[]
      >`select original_url, variants from public.photos where id = ${id}`;
      if (!old) throw new UserFacingError("That photo no longer exists.");
      await sql`
        update public.photos set
          storage_key = ${u.key}, original_url = ${u.originalUrl}, variants = ${sql.json(u.variants)},
          content_type = ${u.contentType}, width = ${u.width}, height = ${u.height}, bytes = ${original.size},
          original_filename = ${u.originalFilename || null}
        where id = ${id}`;
      afterCommit(() => deleteBlobs(photoFiles(old)));
    },
  );
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

const recordVideoSchema = z.object({
  uploads: z.array(videoUpload).min(1).max(20),
  publish: z.boolean(),
  albumIds: z.array(uuid).max(50),
});

export async function recordVideoUploads(input: z.input<typeof recordVideoSchema>) {
  return runAdmin(recordVideoSchema, input, [TAGS.videos], async ({ uploads, publish, albumIds }, sql) => {
    const top = await topPosition(sql, "videos");
    const rows = [];
    for (const [i, u] of uploads.entries()) {
      const [video] = await verifyAll(u.key, "videos", [u.videoUrl, u.posterUrl]);
      rows.push({
        storage_key: u.key,
        video_url: u.videoUrl,
        content_type: u.contentType,
        poster_url: u.posterUrl,
        width: u.width,
        height: u.height,
        duration: u.duration,
        bytes: video.size,
        original_filename: u.originalFilename || null,
        title:
          u.originalFilename
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ")
            .slice(0, 200) || null,
        published: publish,
        position: top - (uploads.length - i),
      });
    }
    const inserted = await sql<{ id: string }[]>`
      insert into public.videos ${sql(rows)}
      on conflict (storage_key) do nothing
      returning id`;
    if (albumIds.length && inserted.length) {
      const links = inserted.flatMap((v) => albumIds.map((album_id) => ({ video_id: v.id, album_id })));
      await sql`insert into public.video_albums ${sql(links)} on conflict do nothing`;
    }
    return inserted.length;
  });
}

const updateVideoSchema = z.object({
  id: uuid,
  title: optionalText(200),
  caption: optionalText(1000),
  recordedOn: isoDate.nullable(),
  published: z.boolean(),
  isFeatured: z.boolean(),
  albumIds: z.array(uuid).max(50),
});

export async function updateVideo(input: z.input<typeof updateVideoSchema>) {
  return runAdmin(updateVideoSchema, input, [TAGS.videos, TAGS.timeline], async (v, sql) => {
    if (v.isFeatured) await sql`update public.videos set is_featured = false where id <> ${v.id}`;
    await sql`
      update public.videos set
        title = ${v.title}, caption = ${v.caption}, recorded_on = ${v.recordedOn}, published = ${v.published},
        is_featured = ${v.isFeatured}
      where id = ${v.id}`;
    await sql`delete from public.video_albums where video_id = ${v.id}`;
    if (v.albumIds.length) {
      await sql`insert into public.video_albums ${sql(v.albumIds.map((album_id) => ({ video_id: v.id, album_id })))}`;
    }
  });
}

const posterSchema = z.object({ id: uuid, key: z.string().max(200), posterUrl: blobUrl });

/** Use an uploaded image as a video's thumbnail. */
export async function setVideoPoster(input: z.input<typeof posterSchema>) {
  return runAdmin(
    posterSchema,
    input,
    [TAGS.videos, TAGS.timeline],
    async ({ id, key, posterUrl }, sql, afterCommit) => {
      await verifyAll(key, "posters", [posterUrl]);
      const [old] = await sql<
        { poster_url: string | null }[]
      >`select poster_url from public.videos where id = ${id}`;
      if (!old) throw new UserFacingError("That video no longer exists.");
      await sql`update public.videos set poster_url = ${posterUrl} where id = ${id}`;
      if (old.poster_url && old.poster_url !== posterUrl) afterCommit(() => deleteBlobs([old.poster_url]));
    },
  );
}

const replaceVideoSchema = z.object({ id: uuid, upload: videoUpload });

export async function replaceVideo(input: z.input<typeof replaceVideoSchema>) {
  return runAdmin(
    replaceVideoSchema,
    input,
    [TAGS.videos, TAGS.timeline],
    async ({ id, upload: u }, sql, afterCommit) => {
      const [video] = await verifyAll(u.key, "videos", [u.videoUrl, u.posterUrl]);
      const [old] = await sql<{ video_url: string; poster_url: string | null }[]>`
        select video_url, poster_url from public.videos where id = ${id}`;
      if (!old) throw new UserFacingError("That video no longer exists.");
      await sql`
        update public.videos set
          storage_key = ${u.key}, video_url = ${u.videoUrl}, content_type = ${u.contentType},
          poster_url = ${u.posterUrl ?? old.poster_url}, width = ${u.width}, height = ${u.height},
          duration = ${u.duration}, bytes = ${video.size}, original_filename = ${u.originalFilename || null}
        where id = ${id}`;
      afterCommit(() => deleteBlobs([old.video_url, u.posterUrl ? old.poster_url : null]));
    },
  );
}

export async function deleteVideo(id: string) {
  return runAdmin(uuid, id, [TAGS.videos, TAGS.timeline], async (videoId, sql, afterCommit) => {
    const [row] = await sql<{ video_url: string; poster_url: string | null }[]>`
      delete from public.videos where id = ${videoId} returning video_url, poster_url`;
    if (row) afterCommit(() => deleteBlobs([row.video_url, row.poster_url]));
  });
}

const moveVideoSchema = z.object({ id: uuid, direction: z.enum(["up", "down"]) });

export async function moveVideo(input: z.input<typeof moveVideoSchema>) {
  return runAdmin(moveVideoSchema, input, [TAGS.videos], async ({ id, direction }, sql) => {
    const rows = await sql<{ id: string }[]>`select id from public.videos order by position, created_at desc`;
    const i = rows.findIndex((r) => r.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length) return;
    // Renumber so swapping is always well-defined, even after ties.
    const order = rows.map((r) => r.id);
    [order[i], order[j]] = [order[j], order[i]];
    for (const [n, vid] of order.entries()) {
      await sql`update public.videos set position = ${n} where id = ${vid}`;
    }
  });
}
