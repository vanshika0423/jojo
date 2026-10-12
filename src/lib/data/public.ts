import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicClient } from "@/lib/supabase/public";
import { defaultSettings, parseSetting, type SiteSettings } from "@/lib/settings";
import type { Album, Letter, LittleThing, Photo, StorySection, TimelineEvent, Video } from "@/lib/types";
import {
  PHOTO_COLUMNS,
  VIDEO_COLUMNS,
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
// When Supabase is not configured yet, readers return gentle defaults.

function logError(scope: string, error: unknown) {
  console.error(`[data] ${scope} failed`, error);
}

export type PublicSettings = SiteSettings & { heroPhoto: Photo | null };

export async function getSettings(): Promise<PublicSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.settings, TAGS.photos);

  const supabase = getPublicClient();
  if (!supabase) return { ...defaultSettings, heroPhoto: null };

  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) logError("settings", error);
  const byKey = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  const settings: SiteSettings = {
    hero: parseSetting("hero", byKey.get("hero")),
    home: parseSetting("home", byKey.get("home")),
    features: parseSetting("features", byKey.get("features")),
  };

  let heroPhoto: Photo | null = null;
  if (settings.hero.photoId) {
    const { data: row } = await supabase
      .from("photos")
      .select(PHOTO_COLUMNS)
      .eq("id", settings.hero.photoId)
      .maybeSingle();
    heroPhoto = row ? toPhoto(row) : null;
  }
  return { ...settings, heroPhoto };
}

export async function getAlbums(): Promise<Album[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.albums);

  const supabase = getPublicClient();
  if (!supabase) return defaultAlbums;
  const { data, error } = await supabase
    .from("albums")
    .select("id, slug, name, description, cover_photo_id, position, published")
    .order("position")
    .order("name");
  if (error) logError("albums", error);
  return (data ?? []).map(toAlbum);
}

export type PhotoQuery = {
  album?: string | null;
  favourites?: boolean;
  q?: string | null;
  offset?: number;
  limit?: number;
};

export type PhotoPage = { photos: Photo[]; total: number | null; hasMore: boolean };

/** Keep search input to characters that are safe inside a PostgREST filter. */
export function sanitizeSearch(q: string | null | undefined) {
  return (q ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

async function queryPhotos({
  album,
  favourites,
  q,
  offset = 0,
  limit = 40,
}: PhotoQuery): Promise<PhotoPage> {
  const supabase = getPublicClient();
  if (!supabase) return { photos: [], total: 0, hasMore: false };

  let albumId: string | null = null;
  if (album) {
    const { data } = await supabase.from("albums").select("id").eq("slug", album).maybeSingle();
    if (!data) return { photos: [], total: 0, hasMore: false };
    albumId = data.id;
  }

  const columns = albumId ? `${PHOTO_COLUMNS}, photo_albums!inner(album_id)` : PHOTO_COLUMNS;
  let query = supabase
    .from("photos")
    .select(columns, { count: offset === 0 ? "exact" : undefined })
    .eq("published", true);
  if (albumId) query = query.eq("photo_albums.album_id", albumId);
  if (favourites) query = query.eq("is_favourite", true);
  const search = sanitizeSearch(q);
  if (search) {
    const tag = search.toLowerCase().replace(/\s+/g, "-");
    query = query.or(`caption.ilike.%${search}%,tags.cs.{"${tag}"}`);
  }
  const { data, error, count } = await query
    .order("position")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    logError("photos", error);
    return { photos: [], total: 0, hasMore: false };
  }
  const photos = (data ?? []).map((r) => toPhoto(r as unknown as Record<string, unknown>));
  return {
    photos,
    total: count ?? null,
    hasMore: photos.length === limit,
  };
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

  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("videos")
    .select(`${VIDEO_COLUMNS}, video_albums(album_id)`)
    .eq("published", true)
    .order("position")
    .order("created_at", { ascending: false });
  if (error) logError("videos", error);
  return (data ?? []).map(toVideo);
}

export async function getFeaturedVideo(): Promise<Video | null> {
  const videos = await getVideos();
  return videos.find((v) => v.isFeatured) ?? videos[0] ?? null;
}

export async function getTimeline(): Promise<TimelineEvent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.timeline, TAGS.photos, TAGS.videos);

  const supabase = getPublicClient();
  if (!supabase) return defaultTimeline;
  const { data, error } = await supabase
    .from("timeline_events")
    .select(
      `id, event_date, date_precision, title, story, published,
       timeline_event_media(position, photo:photos(${PHOTO_COLUMNS}), video:videos(${VIDEO_COLUMNS}))`,
    )
    .eq("published", true)
    .order("event_date");
  if (error) logError("timeline", error);
  return (data ?? []).map(toTimelineEvent);
}

export async function getStorySections(): Promise<StorySection[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.story, TAGS.photos);

  const supabase = getPublicClient();
  if (!supabase) return defaultStorySections;
  const { data, error } = await supabase
    .from("story_sections")
    .select(`id, slug, title, body, position, published, photo:photos(${PHOTO_COLUMNS})`)
    .eq("published", true)
    .order("position");
  if (error) logError("story", error);
  return (data ?? []).map(toStorySection);
}

export async function getLittleThings(): Promise<LittleThing[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.littleThings, TAGS.photos);

  const supabase = getPublicClient();
  if (!supabase) return defaultLittleThings;
  const { data, error } = await supabase
    .from("little_things")
    .select(`id, slug, title, body, emoji, position, published, photo:photos(${PHOTO_COLUMNS})`)
    .eq("published", true)
    .order("position");
  if (error) logError("little things", error);
  return (data ?? []).map(toLittleThing);
}

export async function getPublicLetters(): Promise<Letter[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.letters, TAGS.photos);

  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("letters")
    .select(
      `id, author_name, body, letter_date, visibility, status, written_by_admin, created_at, photo:photos(${PHOTO_COLUMNS})`,
    )
    .eq("status", "approved")
    .eq("visibility", "public")
    .order("letter_date", { ascending: false })
    .limit(200);
  if (error) logError("letters", error);
  return (data ?? []).map(toLetter);
}
