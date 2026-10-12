"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
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
import type { ActionResult, AdminPhoto } from "@/lib/types";
import { UserFacingError, check, isoDate, optionalText, runAdmin, uuid } from "./run";

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

async function topPosition(supabase: SupabaseClient, table: "photos" | "videos") {
  const { data } = await supabase.from(table).select("position").order("position").limit(1).maybeSingle();
  return data ? Number(data.position) : 0;
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
    async ({ assets, publish, albumIds }, supabase) => {
      assets.forEach((a) => assertGenuine(a, "photo"));
      const top = await topPosition(supabase, "photos");
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
      const inserted = check(
        await supabase.from("photos").upsert(rows, { onConflict: "public_id" }).select("id"),
        "photo",
      );
      if (albumIds.length) {
        const links = inserted.flatMap((p) => albumIds.map((album_id) => ({ photo_id: p.id, album_id })));
        check(await supabase.from("photo_albums").upsert(links, { ignoreDuplicates: true }), "album link");
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
  return runAdmin(
    updatePhotoSchema,
    input,
    [TAGS.photos, TAGS.albums, TAGS.settings],
    async (p, supabase) => {
      check(
        await supabase
          .from("photos")
          .update({
            caption: p.caption,
            alt: p.alt,
            taken_on: p.takenOn,
            tags: p.tags,
            is_favourite: p.isFavourite,
            allow_download: p.allowDownload,
            published: p.published,
          })
          .eq("id", p.id),
        "photo",
      );
      check(await supabase.from("photo_albums").delete().eq("photo_id", p.id), "album link");
      if (p.albumIds.length) {
        check(
          await supabase
            .from("photo_albums")
            .insert(p.albumIds.map((album_id) => ({ photo_id: p.id, album_id }))),
          "album link",
        );
      }
    },
  );
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
    async ({ ids, op, albumId }, supabase) => {
      const set = (values: Record<string, boolean>) =>
        supabase
          .from("photos")
          .update(values)
          .in("id", ids)
          .then((r) => check(r, "photos"));
      switch (op) {
        case "publish":
          return void (await set({ published: true }));
        case "unpublish":
          return void (await set({ published: false }));
        case "favourite":
          return void (await set({ is_favourite: true }));
        case "unfavourite":
          return void (await set({ is_favourite: false }));
        case "allowDownload":
          return void (await set({ allow_download: true }));
        case "disallowDownload":
          return void (await set({ allow_download: false }));
        case "addToAlbum":
        case "removeFromAlbum": {
          if (!albumId) throw new UserFacingError("Choose an album first.");
          if (op === "addToAlbum") {
            check(
              await supabase.from("photo_albums").upsert(
                ids.map((photo_id) => ({ photo_id, album_id: albumId })),
                { ignoreDuplicates: true },
              ),
              "album link",
            );
          } else {
            check(
              await supabase.from("photo_albums").delete().eq("album_id", albumId).in("photo_id", ids),
              "album link",
            );
          }
          return;
        }
        case "delete": {
          const rows = check(await supabase.from("photos").select("id, public_id").in("id", ids), "photos");
          check(await supabase.from("photos").delete().in("id", ids), "photos");
          await Promise.all(rows.map((r) => destroyAsset(r.public_id, "image")));
          return;
        }
      }
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
  return runAdmin(moveSchema, input, [TAGS.photos], async ({ id, afterId, beforeId }, supabase) => {
    const ids = [afterId, beforeId].filter((x): x is string => Boolean(x));
    const neighbours = ids.length
      ? check(await supabase.from("photos").select("id, position").in("id", ids), "photos")
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
    else position = (await topPosition(supabase, "photos")) - 1;
    check(await supabase.from("photos").update({ position }).eq("id", id), "photo");
  });
}

const replaceSchema = z.object({ id: uuid, asset: uploadedAsset });

/** Swap the image file but keep caption, albums, order and links. */
export async function replacePhoto(input: z.input<typeof replaceSchema>) {
  return runAdmin(
    replaceSchema,
    input,
    [TAGS.photos, TAGS.settings, TAGS.story, TAGS.littleThings, TAGS.timeline, TAGS.letters],
    async ({ id, asset }, supabase) => {
      assertGenuine(asset, "photo");
      const old = check(await supabase.from("photos").select("public_id").eq("id", id).single(), "photo");
      check(
        await supabase
          .from("photos")
          .update({
            public_id: asset.public_id,
            version: asset.version,
            width: asset.width ?? 1,
            height: asset.height ?? 1,
            format: asset.format ?? null,
            bytes: asset.bytes ?? null,
            original_filename: asset.original_filename ?? null,
          })
          .eq("id", id),
        "photo",
      );
      if (old.public_id !== asset.public_id) await destroyAsset(old.public_id, "image");
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
  return runAdmin(
    recordVideoSchema,
    input,
    [TAGS.videos],
    async ({ assets, publish, albumIds }, supabase) => {
      assets.forEach((a) => assertGenuine(a, "video"));
      const top = await topPosition(supabase, "videos");
      const inserted = check(
        await supabase
          .from("videos")
          .upsert(
            assets.map((a, i) => ({
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
            })),
            { onConflict: "public_id" },
          )
          .select("id"),
        "video",
      );
      if (albumIds.length) {
        check(
          await supabase.from("video_albums").upsert(
            inserted.flatMap((v) => albumIds.map((album_id) => ({ video_id: v.id, album_id }))),
            {
              ignoreDuplicates: true,
            },
          ),
          "album link",
        );
      }
      return inserted.length;
    },
  );
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
  return runAdmin(updateVideoSchema, input, [TAGS.videos, TAGS.timeline], async (v, supabase) => {
    if (v.isFeatured) {
      check(await supabase.from("videos").update({ is_featured: false }).neq("id", v.id), "video");
    }
    check(
      await supabase
        .from("videos")
        .update({
          title: v.title,
          caption: v.caption,
          recorded_on: v.recordedOn,
          published: v.published,
          is_featured: v.isFeatured,
          poster_offset: v.posterOffset,
        })
        .eq("id", v.id),
      "video",
    );
    check(await supabase.from("video_albums").delete().eq("video_id", v.id), "album link");
    if (v.albumIds.length) {
      check(
        await supabase
          .from("video_albums")
          .insert(v.albumIds.map((album_id) => ({ video_id: v.id, album_id }))),
        "album link",
      );
    }
  });
}

const posterSchema = z.object({ id: uuid, asset: uploadedAsset.nullable() });

/** Set a custom thumbnail image for a video, or clear it (null). */
export async function setVideoPoster(input: z.input<typeof posterSchema>) {
  return runAdmin(posterSchema, input, [TAGS.videos, TAGS.timeline], async ({ id, asset }, supabase) => {
    if (asset) assertGenuine(asset, "poster");
    const old = check(
      await supabase.from("videos").select("poster_public_id").eq("id", id).single(),
      "video",
    );
    check(
      await supabase
        .from("videos")
        .update({ poster_public_id: asset?.public_id ?? null, poster_version: asset?.version ?? null })
        .eq("id", id),
      "video",
    );
    if (old.poster_public_id && old.poster_public_id !== asset?.public_id) {
      await destroyAsset(old.poster_public_id, "image");
    }
  });
}

const replaceVideoSchema = z.object({ id: uuid, asset: uploadedAsset });

export async function replaceVideo(input: z.input<typeof replaceVideoSchema>) {
  return runAdmin(
    replaceVideoSchema,
    input,
    [TAGS.videos, TAGS.timeline],
    async ({ id, asset }, supabase) => {
      assertGenuine(asset, "video");
      const old = check(await supabase.from("videos").select("public_id").eq("id", id).single(), "video");
      check(
        await supabase
          .from("videos")
          .update({
            public_id: asset.public_id,
            version: asset.version,
            width: asset.width ?? null,
            height: asset.height ?? null,
            duration: asset.duration ?? null,
            format: asset.format ?? null,
            bytes: asset.bytes ?? null,
            original_filename: asset.original_filename ?? null,
          })
          .eq("id", id),
        "video",
      );
      if (old.public_id !== asset.public_id) await destroyAsset(old.public_id, "video");
    },
  );
}

export async function deleteVideo(id: string) {
  return runAdmin(uuid, id, [TAGS.videos, TAGS.timeline], async (videoId, supabase) => {
    const row = check(
      await supabase.from("videos").select("public_id, poster_public_id").eq("id", videoId).single(),
      "video",
    );
    check(await supabase.from("videos").delete().eq("id", videoId), "video");
    await destroyAsset(row.public_id, "video");
    if (row.poster_public_id) await destroyAsset(row.poster_public_id, "image");
  });
}

const moveVideoSchema = z.object({ id: uuid, direction: z.enum(["up", "down"]) });

export async function moveVideo(input: z.input<typeof moveVideoSchema>) {
  return runAdmin(moveVideoSchema, input, [TAGS.videos], async ({ id, direction }, supabase) => {
    const rows = check(
      await supabase
        .from("videos")
        .select("id, position")
        .order("position")
        .order("created_at", { ascending: false }),
      "videos",
    );
    const i = rows.findIndex((r) => r.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length) return;
    // Renumber so swapping is always well-defined, even after ties.
    const order = rows.map((r) => r.id);
    [order[i], order[j]] = [order[j], order[i]];
    await Promise.all(
      order.map((vid, n) =>
        supabase
          .from("videos")
          .update({ position: n })
          .eq("id", vid)
          .then((r) => check(r, "video")),
      ),
    );
  });
}
