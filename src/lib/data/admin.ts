import "server-only";
import { requireAdmin } from "@/lib/auth";
import { PHOTO_SQL_COLUMNS, VIDEO_SQL_COLUMNS, requireDb } from "@/lib/db";
import { defaultSettings, parseSetting, type SiteSettings } from "@/lib/settings";
import type {
  Album,
  AdminPhoto,
  Photo,
  Letter,
  LetterStatus,
  LittleThing,
  StorySection,
  TimelineEvent,
  Video,
} from "@/lib/types";
import {
  toAlbum,
  toLetter,
  toLittleThing,
  toPhoto,
  toStorySection,
  toTimelineEvent,
  toVideo,
} from "@/lib/data/mappers";
import { likePattern, photoJson, sanitizeSearch, timelineMediaJson, type Row } from "@/lib/data/public";

// Dashboard readers: drafts included. Every one checks the admin first.
// Never cached.

async function adminDb() {
  await requireAdmin();
  return requireDb();
}

export type AdminPhotoFilter = "all" | "published" | "draft" | "favourites";

export type AdminPhotoQuery = {
  filter?: AdminPhotoFilter;
  albumId?: string | null;
  q?: string | null;
  offset?: number;
  limit?: number;
};

export function toAdminPhoto(row: Row): AdminPhoto {
  return {
    ...toPhoto(row),
    albumIds: Array.isArray(row.album_ids) ? row.album_ids : [],
    bytes: row.bytes != null ? Number(row.bytes) : null,
    originalFilename: row.original_filename ?? null,
    createdAt: String(row.created_at),
  };
}

const ADMIN_PHOTO_EXTRA = `p.bytes, p.original_filename, p.created_at::text as created_at,
  coalesce((select array_agg(pa.album_id::text) from public.photo_albums pa where pa.photo_id = p.id), '{}') as album_ids`;

export async function listAdminPhotos({
  filter = "all",
  albumId,
  q,
  offset = 0,
  limit = 60,
}: AdminPhotoQuery): Promise<{ photos: AdminPhoto[]; total: number; hasMore: boolean }> {
  const sql = await adminDb();
  const search = sanitizeSearch(q);
  const tag = search.toLowerCase().replace(/\s+/g, "-");
  const pattern = likePattern(search);
  const rows = await sql<Row[]>`
    select ${sql.unsafe(PHOTO_SQL_COLUMNS)}, ${sql.unsafe(ADMIN_PHOTO_EXTRA)}, count(*) over () as total_count
    from public.photos p
    where true
      ${albumId ? sql`and exists (select 1 from public.photo_albums pa where pa.photo_id = p.id and pa.album_id = ${albumId})` : sql``}
      ${filter === "published" ? sql`and p.published` : sql``}
      ${filter === "draft" ? sql`and not p.published` : sql``}
      ${filter === "favourites" ? sql`and p.is_favourite` : sql``}
      ${
        search
          ? sql`and (p.caption ilike ${pattern} or p.original_filename ilike ${pattern} or p.tags @> array[${tag}]::text[])`
          : sql``
      }
    order by p.position, p.created_at desc
    limit ${limit} offset ${offset}`;
  const photos = rows.map(toAdminPhoto);
  const total = rows.length ? Number(rows[0].total_count) : 0;
  return { photos, total, hasMore: offset + photos.length < total };
}

export async function getAdminAlbums(): Promise<Array<Album & { photoCount: number; cover: Photo | null }>> {
  const sql = await adminDb();
  const rows = await sql<Row[]>`
    select a.id, a.slug, a.name, a.description, a.cover_photo_id, a.position, a.published,
      (select count(*) from public.photo_albums pa where pa.album_id = a.id)::int as photo_count,
      ${photoJson(sql, "a.cover_photo_id", false)} as cover
    from public.albums a
    order by a.position, a.name`;
  return rows.map((row) => ({
    ...toAlbum(row),
    photoCount: row.photo_count ?? 0,
    cover: row.cover ? toPhoto(row.cover) : null,
  }));
}

export async function getAdminVideos(): Promise<Video[]> {
  const sql = await adminDb();
  const rows = await sql<Row[]>`
    select ${sql.unsafe(VIDEO_SQL_COLUMNS)},
      coalesce((select json_agg(json_build_object('album_id', va.album_id))
                from public.video_albums va where va.video_id = v.id), '[]') as video_albums
    from public.videos v
    order by v.position, v.created_at desc`;
  return rows.map(toVideo);
}

export async function getAdminTimeline(): Promise<TimelineEvent[]> {
  const sql = await adminDb();
  const rows = await sql<Row[]>`
    select e.id, e.event_date, e.date_precision, e.title, e.story, e.published,
      ${timelineMediaJson(sql, false)} as timeline_event_media
    from public.timeline_events e
    order by e.event_date`;
  return rows.map(toTimelineEvent);
}

export async function getAdminStory(): Promise<StorySection[]> {
  const sql = await adminDb();
  const rows = await sql<Row[]>`
    select s.id, s.slug, s.title, s.body, s.position, s.published, ${photoJson(sql, "s.photo_id", false)} as photo
    from public.story_sections s
    order by s.position`;
  return rows.map(toStorySection);
}

export async function getAdminLittleThings(): Promise<LittleThing[]> {
  const sql = await adminDb();
  const rows = await sql<Row[]>`
    select t.id, t.slug, t.title, t.body, t.emoji, t.position, t.published,
      ${photoJson(sql, "t.photo_id", false)} as photo
    from public.little_things t
    order by t.position`;
  return rows.map(toLittleThing);
}

export async function getAdminLetters(status: LetterStatus | "all" = "all"): Promise<Letter[]> {
  const sql = await adminDb();
  const rows = await sql<Row[]>`
    select l.id, l.author_name, l.body, l.letter_date, l.visibility, l.status, l.written_by_admin,
      l.created_at::text as created_at, ${photoJson(sql, "l.photo_id", false)} as photo
    from public.letters l
    ${status !== "all" ? sql`where l.status = ${status}` : sql``}
    order by l.created_at desc
    limit 500`;
  return rows.map(toLetter);
}

export async function getAdminSettings(): Promise<SiteSettings & { heroPhoto: AdminPhoto | null }> {
  const sql = await adminDb();
  const rows = await sql<Row[]>`select key, value from public.site_settings`;
  const byKey = new Map(rows.map((r) => [r.key as string, r.value as unknown]));
  const settings: SiteSettings = {
    hero: parseSetting("hero", byKey.get("hero") ?? defaultSettings.hero),
    home: parseSetting("home", byKey.get("home") ?? defaultSettings.home),
    features: parseSetting("features", byKey.get("features") ?? defaultSettings.features),
  };
  let heroPhoto: AdminPhoto | null = null;
  if (settings.hero.photoId) {
    const [row] = await sql<Row[]>`
      select ${sql.unsafe(PHOTO_SQL_COLUMNS)}, ${sql.unsafe(ADMIN_PHOTO_EXTRA)}
      from public.photos p where p.id = ${settings.hero.photoId}`;
    heroPhoto = row ? toAdminPhoto(row) : null;
  }
  return { ...settings, heroPhoto };
}

export async function getOverview() {
  const sql = await adminDb();
  const [row] = await sql<Row[]>`
    select
      (select count(*) from public.photos)::int as photos,
      (select count(*) from public.photos where published)::int as published_photos,
      (select count(*) from public.videos)::int as videos,
      (select count(*) from public.timeline_events)::int as events,
      (select count(*) from public.letters where status = 'pending')::int as pending_letters,
      (select count(*) from public.albums)::int as albums`;
  return {
    photos: row.photos,
    publishedPhotos: row.published_photos,
    videos: row.videos,
    events: row.events,
    pendingLetters: row.pending_letters,
    albums: row.albums,
  };
}
