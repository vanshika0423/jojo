import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PHOTO_SQL_COLUMNS, VIDEO_SQL_COLUMNS, db } from "@/lib/db";
import { defaultSettings, parseSetting, type SiteSettings } from "@/lib/settings";
import type { Album, Letter, LittleThing, Photo, StorySection, TimelineEvent, Video } from "@/lib/types";
import {
  toAlbum,
  toLetter,
  toLittleThing,
  toPhoto,
  toStorySection,
  toTimelineEvent,
  toVideo,
} from "@/lib/data/mappers";
import {
  defaultAlbums,
  defaultLittleThings,
  defaultStorySections,
  defaultTimeline,
} from "@/lib/data/placeholders";
import { TAGS } from "@/lib/data/tags";

// Every reader here is cached with `use cache` and tagged, so public pages are
// served from the static shell and refreshed the moment an admin saves.
// Only *published* content is ever returned. When the database is not
// configured yet, readers return gentle defaults.

/* eslint-disable @typescript-eslint/no-explicit-any -- raw SQL rows go through the mappers */
export type Row = Record<string, any>;

function logError(scope: string, error: unknown) {
  console.error(`[data] ${scope} failed`, error);
}

async function safely<T>(scope: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    logError(scope, error);
    return fallback;
  }
}

export type PublicSettings = SiteSettings & { heroPhoto: Photo | null };

export async function getSettings(): Promise<PublicSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.settings, TAGS.photos);

  const sql = db();
  const fallback = { ...defaultSettings, heroPhoto: null };
  if (!sql) return fallback;

  return safely("settings", fallback, async () => {
    const rows = await sql<Row[]>`select key, value from public.site_settings`;
    const byKey = new Map(rows.map((r) => [r.key as string, r.value as unknown]));
    const settings: SiteSettings = {
      hero: parseSetting("hero", byKey.get("hero")),
      home: parseSetting("home", byKey.get("home")),
      features: parseSetting("features", byKey.get("features")),
    };
    let heroPhoto: Photo | null = null;
    if (settings.hero.photoId) {
      const [row] = await sql<Row[]>`
        select ${sql.unsafe(PHOTO_SQL_COLUMNS)} from public.photos p
        where p.id = ${settings.hero.photoId} and p.published`;
      heroPhoto = row ? toPhoto(row) : null;
    }
    return { ...settings, heroPhoto };
  });
}

export async function getAlbums(): Promise<Album[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.albums);

  const sql = db();
  if (!sql) return defaultAlbums;
  return safely("albums", [], async () => {
    const rows = await sql<Row[]>`
      select id, slug, name, description, cover_photo_id, position, published
      from public.albums where published order by position, name`;
    return rows.map(toAlbum);
  });
}

export type PhotoQuery = {
  album?: string | null;
  favourites?: boolean;
  q?: string | null;
  offset?: number;
  limit?: number;
};

export type PhotoPage = { photos: Photo[]; total: number | null; hasMore: boolean };

/** Normalise free-text search input. */
export function sanitizeSearch(q: string | null | undefined) {
  return (q ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Escape LIKE wildcards so search text is matched literally. */
export function likePattern(search: string) {
  return `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

async function queryPhotos({ album, favourites, q, offset = 0, limit = 40 }: PhotoQuery): Promise<PhotoPage> {
  const sql = db();
  const empty = { photos: [], total: 0, hasMore: false };
  if (!sql) return empty;

  return safely("photos", empty, async () => {
    const search = sanitizeSearch(q);
    const tag = search.toLowerCase().replace(/\s+/g, "-");
    const rows = await sql<Row[]>`
      select ${sql.unsafe(PHOTO_SQL_COLUMNS)}, count(*) over () as total_count
      from public.photos p
      where p.published
        ${
          album
            ? sql`and exists (
                select 1 from public.photo_albums pa join public.albums a on a.id = pa.album_id
                where pa.photo_id = p.id and a.slug = ${album} and a.published)`
            : sql``
        }
        ${favourites ? sql`and p.is_favourite` : sql``}
        ${search ? sql`and (p.caption ilike ${likePattern(search)} or p.tags @> array[${tag}]::text[])` : sql``}
      order by p.position, p.created_at desc
      limit ${limit} offset ${offset}`;
    const photos = rows.map(toPhoto);
    const total = rows.length ? Number(rows[0].total_count) : offset === 0 ? 0 : null;
    return { photos, total, hasMore: photos.length === limit };
  });
}

/** Cached browsing (albums, favourites, paging). */
export async function getPhotoPage(query: Omit<PhotoQuery, "q">): Promise<PhotoPage> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.photos, TAGS.albums);
  return queryPhotos(query);
}

/** Free-text search is not cached: the space of queries is unbounded. */
export async function searchPhotos(query: PhotoQuery): Promise<PhotoPage> {
  return queryPhotos(query);
}

export async function getFeaturedPhotos(limit = 6): Promise<Photo[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.photos);
  const favourites = await queryPhotos({ favourites: true, limit });
  if (favourites.photos.length >= Math.min(3, limit)) return favourites.photos;
  return (await queryPhotos({ limit })).photos;
}

export async function getRecentPhotos(limit = 14): Promise<Photo[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.photos);
  return (await queryPhotos({ limit })).photos;
}

export async function getVideos(): Promise<Video[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.videos, TAGS.albums);

  const sql = db();
  if (!sql) return [];
  return safely("videos", [], async () => {
    const rows = await sql<Row[]>`
      select ${sql.unsafe(VIDEO_SQL_COLUMNS)},
        coalesce((select json_agg(json_build_object('album_id', va.album_id))
                  from public.video_albums va where va.video_id = v.id), '[]') as video_albums
      from public.videos v
      where v.published
      order by v.position, v.created_at desc`;
    return rows.map(toVideo);
  });
}

export async function getFeaturedVideo(): Promise<Video | null> {
  const videos = await getVideos();
  return videos.find((v) => v.isFeatured) ?? videos[0] ?? null;
}

/** JSON for one photo/video, or null — embedded in other rows like PostgREST did. */
export function photoJson(sql: NonNullable<ReturnType<typeof db>>, idColumn: string, publishedOnly: boolean) {
  return sql.unsafe(
    `(select to_jsonb(x) from (select ${PHOTO_SQL_COLUMNS} from public.photos p
       where p.id = ${idColumn}${publishedOnly ? " and p.published" : ""}) x)`,
  );
}

export function timelineMediaJson(sql: NonNullable<ReturnType<typeof db>>, publishedOnly: boolean) {
  const pub = (alias: string) => (publishedOnly ? ` and ${alias}.published` : "");
  return sql.unsafe(`coalesce((
    select json_agg(json_build_object(
      'position', m.position,
      'photo', (select to_jsonb(x) from (select ${PHOTO_SQL_COLUMNS} from public.photos p where p.id = m.photo_id${pub("p")}) x),
      'video', (select to_jsonb(y) from (select ${VIDEO_SQL_COLUMNS} from public.videos v where v.id = m.video_id${pub("v")}) y)
    ) order by m.position)
    from public.timeline_event_media m where m.event_id = e.id), '[]')`);
}

export async function getTimeline(): Promise<TimelineEvent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.timeline, TAGS.photos, TAGS.videos);

  const sql = db();
  if (!sql) return defaultTimeline;
  return safely("timeline", [], async () => {
    const rows = await sql<Row[]>`
      select e.id, e.event_date, e.date_precision, e.title, e.story, e.published,
        ${timelineMediaJson(sql, true)} as timeline_event_media
      from public.timeline_events e
      where e.published
      order by e.event_date`;
    return rows.map(toTimelineEvent);
  });
}

export async function getStorySections(): Promise<StorySection[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.story, TAGS.photos);

  const sql = db();
  if (!sql) return defaultStorySections;
  return safely("story", [], async () => {
    const rows = await sql<Row[]>`
      select s.id, s.slug, s.title, s.body, s.position, s.published, ${photoJson(sql, "s.photo_id", true)} as photo
      from public.story_sections s
      where s.published
      order by s.position`;
    return rows.map(toStorySection);
  });
}

export async function getLittleThings(): Promise<LittleThing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.littleThings, TAGS.photos);

  const sql = db();
  if (!sql) return defaultLittleThings;
  return safely("little things", [], async () => {
    const rows = await sql<Row[]>`
      select t.id, t.slug, t.title, t.body, t.emoji, t.position, t.published,
        ${photoJson(sql, "t.photo_id", true)} as photo
      from public.little_things t
      where t.published
      order by t.position`;
    return rows.map(toLittleThing);
  });
}

export async function getPublicLetters(): Promise<Letter[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.letters, TAGS.photos);

  const sql = db();
  if (!sql) return [];
  return safely("letters", [], async () => {
    const rows = await sql<Row[]>`
      select l.id, l.author_name, l.body, l.letter_date, l.visibility, l.status, l.written_by_admin,
        l.created_at::text as created_at, ${photoJson(sql, "l.photo_id", true)} as photo
      from public.letters l
      where l.status = 'approved' and l.visibility = 'public'
      order by l.letter_date desc
      limit 200`;
    return rows.map(toLetter);
  });
}
