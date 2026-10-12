"use server";

import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import {
  destroyAsset,
  isCloudinaryServerConfigured,
  isOwnPublicId,
  signUpload,
  verifyUploadSignature,
  type UploadKind,
} from "@/lib/cloudinary/server";
import { listAdminPhotos, type AdminPhotoQuery } from "@/lib/data/admin";
import { TAGS } from "@/lib/data/tags";
import type { Sql } from "@/lib/db";
import type { ActionResult, AdminPhoto } from "@/lib/types";
import { UserFacingError, isoDate, optionalText, runAdmin, uuid } from "./run";

// ---------------------------------------------------------------------------
// Uploading
// ---------------------------------------------------------------------------

export async function getUploadSignature(kind: UploadKind) {
  await assertAdmin();
  if (!["photo", "video", "poster"].includes(kind)) throw new Error("Unknown upload type");
  if (!isCloudinaryServerConfigured) {
    return {
      ok: false as const,
      error: "Cloudinary isn’t configured yet. See the setup guide in README.md.",
    };
  }
  return { ok: true as const, data: signUpload(kind) };
}

const uploadedAsset = z.object({
  public_id: z.string().min(1).max(300),
  version: z.number().int().positive(),
  signature: z.string().regex(/^[a-f0-9]{40}$/),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.string().max(20).optional(),
  bytes: z.number().int().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
  original_filename: z.string().max(300).optional(),
});

/** Reject anything that didn't genuinely come from our Cloudinary account. */
function assertGenuine(asset: z.infer<typeof uploadedAsset>, kind: UploadKind) {
  if (
    !isOwnPublicId(asset.public_id, kind) ||
    !verifyUploadSignature(asset.public_id, asset.version, asset.signature)
  ) {
    throw new UserFacingError("That upload couldn’t be verified. Please try uploading it again.");
  }
}

async function topPosition(sql: Sql, table: "photos" | "videos") {
  const [row] = await sql<{ top: number | null }[]>`select min(position) as top from ${sql(table)}`;
  return row?.top != null ? Number(row.top) : 0;
}

const recordPhotosSchema = z.object({
  assets: z.array(uploadedAsset).min(1).max(50),
  publish: z.boolean(),
  albumIds: z.array(uuid).max(50),
});

/** Save freshly uploaded photos. They stay unpublished unless `publish` was chosen. */
export async function recordPhotoUploads(input: z.input<typeof recordPhotosSchema>) {
  return runAdmin(
    recordPhotosSchema,
    input,
    [TAGS.photos, TAGS.albums],
    async ({ assets, publish, albumIds }, sql) => {
      assets.forEach((a) => assertGenuine(a, "photo"));
      const top = await topPosition(sql, "photos");
      const rows = assets.map((a, i) => ({
        public_id: a.public_id,
        version: a.version,
        width: a.width ?? 1,
        height: a.height ?? 1,
        format: a.format ?? null,
        bytes: a.bytes ?? null,
        original_filename: a.original_filename ?? null,
        published: publish,
        position: top - (assets.length - i),
      }));
      // Re-recording the same upload (e.g. a retry) updates it instead of duplicating.
      const inserted = await sql<{ id: string }[]>`
        insert into public.photos ${sql(rows)}
        on conflict (public_id) do update set
          version = excluded.version, width = excluded.width, height = excluded.height,
          format = excluded.format, bytes = excluded.bytes, original_filename = excluded.original_filename
        returning id`;
      if (albumIds.length) {
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
      // delete
      const removed = await sql<{ public_id: string }[]>`
        delete from public.photos where id in ${sql(ids)} returning public_id`;
      afterCommit(async () => {
        await Promise.all(removed.map((r) => destroyAsset(r.public_id, "image")));
      });
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

const replaceSchema = z.object({ id: uuid, asset: uploadedAsset });

/** Swap the image file but keep caption, albums, order and links. */
export async function replacePhoto(input: z.input<typeof replaceSchema>) {
  return runAdmin(
    replaceSchema,
    input,
    [TAGS.photos, TAGS.settings, TAGS.story, TAGS.littleThings, TAGS.timeline, TAGS.letters],
    async ({ id, asset }, sql, afterCommit) => {
      assertGenuine(asset, "photo");
      const [old] = await sql<{ public_id: string }[]>`select public_id from public.photos where id = ${id}`;
      if (!old) throw new UserFacingError("That photo no longer exists.");
      await sql`
        update public.photos set
          public_id = ${asset.public_id}, version = ${asset.version},
          width = ${asset.width ?? 1}, height = ${asset.height ?? 1}, format = ${asset.format ?? null},
          bytes = ${asset.bytes ?? null}, original_filename = ${asset.original_filename ?? null}
        where id = ${id}`;
      if (old.public_id !== asset.public_id) afterCommit(() => destroyAsset(old.public_id, "image"));
    },
  );
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

const recordVideoSchema = z.object({
  assets: z.array(uploadedAsset).min(1).max(20),
  publish: z.boolean(),
  albumIds: z.array(uuid).max(50),
});

export async function recordVideoUploads(input: z.input<typeof recordVideoSchema>) {
  return runAdmin(recordVideoSchema, input, [TAGS.videos], async ({ assets, publish, albumIds }, sql) => {
    assets.forEach((a) => assertGenuine(a, "video"));
    const top = await topPosition(sql, "videos");
    const rows = assets.map((a, i) => ({
      public_id: a.public_id,
      version: a.version,
      width: a.width ?? null,
      height: a.height ?? null,
      duration: a.duration ?? null,
      format: a.format ?? null,
      bytes: a.bytes ?? null,
      original_filename: a.original_filename ?? null,
      title: a.original_filename?.replace(/[-_]+/g, " ").slice(0, 200) ?? null,
      published: publish,
      position: top - (assets.length - i),
    }));
    const inserted = await sql<{ id: string }[]>`
        insert into public.videos ${sql(rows)}
        on conflict (public_id) do update set
          version = excluded.version, width = excluded.width, height = excluded.height,
          duration = excluded.duration, format = excluded.format, bytes = excluded.bytes
        returning id`;
    if (albumIds.length) {
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
  posterOffset: z.number().min(0).max(36_000).nullable(),
  albumIds: z.array(uuid).max(50),
});

export async function updateVideo(input: z.input<typeof updateVideoSchema>) {
  return runAdmin(updateVideoSchema, input, [TAGS.videos, TAGS.timeline], async (v, sql) => {
    if (v.isFeatured) await sql`update public.videos set is_featured = false where id <> ${v.id}`;
    await sql`
      update public.videos set
        title = ${v.title}, caption = ${v.caption}, recorded_on = ${v.recordedOn}, published = ${v.published},
        is_featured = ${v.isFeatured}, poster_offset = ${v.posterOffset}
      where id = ${v.id}`;
    await sql`delete from public.video_albums where video_id = ${v.id}`;
    if (v.albumIds.length) {
      await sql`insert into public.video_albums ${sql(v.albumIds.map((album_id) => ({ video_id: v.id, album_id })))}`;
    }
  });
}

const posterSchema = z.object({ id: uuid, asset: uploadedAsset.nullable() });

/** Set a custom thumbnail image for a video, or clear it (null). */
export async function setVideoPoster(input: z.input<typeof posterSchema>) {
  return runAdmin(
    posterSchema,
    input,
    [TAGS.videos, TAGS.timeline],
    async ({ id, asset }, sql, afterCommit) => {
      if (asset) assertGenuine(asset, "poster");
      const [old] = await sql<{ poster_public_id: string | null }[]>`
      select poster_public_id from public.videos where id = ${id}`;
      if (!old) throw new UserFacingError("That video no longer exists.");
      await sql`
      update public.videos set poster_public_id = ${asset?.public_id ?? null}, poster_version = ${asset?.version ?? null}
      where id = ${id}`;
      const previous = old.poster_public_id;
      if (previous && previous !== asset?.public_id) afterCommit(() => destroyAsset(previous, "image"));
    },
  );
}

const replaceVideoSchema = z.object({ id: uuid, asset: uploadedAsset });

export async function replaceVideo(input: z.input<typeof replaceVideoSchema>) {
  return runAdmin(
    replaceVideoSchema,
    input,
    [TAGS.videos, TAGS.timeline],
    async ({ id, asset }, sql, afterCommit) => {
      assertGenuine(asset, "video");
      const [old] = await sql<{ public_id: string }[]>`select public_id from public.videos where id = ${id}`;
      if (!old) throw new UserFacingError("That video no longer exists.");
      await sql`
        update public.videos set
          public_id = ${asset.public_id}, version = ${asset.version}, width = ${asset.width ?? null},
          height = ${asset.height ?? null}, duration = ${asset.duration ?? null}, format = ${asset.format ?? null},
          bytes = ${asset.bytes ?? null}, original_filename = ${asset.original_filename ?? null}
        where id = ${id}`;
      if (old.public_id !== asset.public_id) afterCommit(() => destroyAsset(old.public_id, "video"));
    },
  );
}

export async function deleteVideo(id: string) {
  return runAdmin(uuid, id, [TAGS.videos, TAGS.timeline], async (videoId, sql, afterCommit) => {
    const [row] = await sql<{ public_id: string; poster_public_id: string | null }[]>`
      delete from public.videos where id = ${videoId} returning public_id, poster_public_id`;
    if (!row) return;
    afterCommit(async () => {
      await destroyAsset(row.public_id, "video");
      if (row.poster_public_id) await destroyAsset(row.poster_public_id, "image");
    });
  });
}

const moveVideoSchema = z.object({ id: uuid, direction: z.enum(["up", "down"]) });

export async function moveVideo(input: z.input<typeof moveVideoSchema>) {
  return runAdmin(moveVideoSchema, input, [TAGS.videos], async ({ id, direction }, sql) => {
    const rows = await sql<{ id: string }[]>`
      select id from public.videos order by position, created_at desc`;
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
