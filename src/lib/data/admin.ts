import "server-only";
import { requireAdmin } from "@/lib/auth";
import { getServerClient } from "@/lib/supabase/server";
import { defaultSettings, parseSetting, type SiteSettings } from "@/lib/settings";
import type { Album, AdminPhoto, Photo, Letter, LetterStatus, LittleThing, StorySection, TimelineEvent, Video } from "@/lib/types";
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
import { sanitizeSearch } from "@/lib/data/public";

// Dashboard readers. They run as the signed-in user, so RLS lets admins see
// drafts while everyone else sees nothing. Never cached.

async function adminClient() {
  await requireAdmin();
  return getServerClient();
}

export type AdminPhotoFilter = "all" | "published" | "draft" | "favourites";

export type AdminPhotoQuery = {
  filter?: AdminPhotoFilter;
  albumId?: string | null;
  q?: string | null;
  offset?: number;
  limit?: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST rows */
export function toAdminPhoto(row: any): AdminPhoto {
  return {
    ...toPhoto(row),
    albumIds: (row.photo_albums ?? []).map((a: any) => a.album_id),
    bytes: row.bytes ?? null,
    originalFilename: row.original_filename ?? null,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listAdminPhotos({
  filter = "all",
  albumId,
  q,
  offset = 0,
  limit = 60,
}: AdminPhotoQuery): Promise<{ photos: AdminPhoto[]; total: number; hasMore: boolean }> {
  const supabase = await adminClient();
  const join = albumId ? "photo_albums!inner(album_id)" : "photo_albums(album_id)";
  let query = supabase
    .from("photos")
    .select(`${PHOTO_COLUMNS}, bytes, original_filename, created_at, ${join}`, { count: "exact" });
  if (albumId) query = query.eq("photo_albums.album_id", albumId);
  if (filter === "published") query = query.eq("published", true);
  if (filter === "draft") query = query.eq("published", false);
  if (filter === "favourites") query = query.eq("is_favourite", true);
  const search = sanitizeSearch(q);
  if (search) {
    const tag = search.toLowerCase().replace(/\s+/g, "-");
    query = query.or(`caption.ilike.%${search}%,original_filename.ilike.%${search}%,tags.cs.{"${tag}"}`);
  }
  const { data, count, error } = await query
    .order("position")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  let photos = (data ?? []).map(toAdminPhoto);
  if (albumId) {
    // The inner join only returned the filtered album; fetch the full membership.
    const ids = photos.map((p) => p.id);
    if (ids.length) {
      const { data: links } = await supabase.from("photo_albums").select("photo_id, album_id").in("photo_id", ids);
      const byPhoto = new Map<string, string[]>();
      for (const l of links ?? []) byPhoto.set(l.photo_id, [...(byPhoto.get(l.photo_id) ?? []), l.album_id]);
      photos = photos.map((p) => ({ ...p, albumIds: byPhoto.get(p.id) ?? [] }));
    }
  }
  return { photos, total: count ?? photos.length, hasMore: offset + photos.length < (count ?? 0) };
}

export async function getAdminAlbums(): Promise<Array<Album & { photoCount: number; cover: Photo | null }>> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("albums")
    .select(
      `id, slug, name, description, cover_photo_id, position, published, photo_albums(count),
       cover:photos!albums_cover_photo_id_fkey(${PHOTO_COLUMNS})`,
    )
    .order("position")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...toAlbum(row),
    photoCount: (row.photo_albums as unknown as Array<{ count: number }>)?.[0]?.count ?? 0,
    cover: row.cover ? toPhoto(row.cover as unknown as Record<string, unknown>) : null,
  }));
}

export async function getAdminVideos(): Promise<Video[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("videos")
    .select(`${VIDEO_COLUMNS}, video_albums(album_id)`)
    .order("position")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toVideo);
}

export async function getAdminTimeline(): Promise<TimelineEvent[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .select(
      `id, event_date, date_precision, title, story, published,
       timeline_event_media(position, photo:photos(${PHOTO_COLUMNS}), video:videos(${VIDEO_COLUMNS}))`,
    )
    .order("event_date");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toTimelineEvent);
}

export async function getAdminStory(): Promise<StorySection[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("story_sections")
    .select(`id, slug, title, body, position, published, photo:photos(${PHOTO_COLUMNS})`)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toStorySection);
}

export async function getAdminLittleThings(): Promise<LittleThing[]> {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("little_things")
    .select(`id, slug, title, body, emoji, position, published, photo:photos(${PHOTO_COLUMNS})`)
    .order("position");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toLittleThing);
}

export async function getAdminLetters(status: LetterStatus | "all" = "all"): Promise<Letter[]> {
  const supabase = await adminClient();
  let query = supabase
    .from("letters")
    .select(
      `id, author_name, body, letter_date, visibility, status, written_by_admin, created_at, photo:photos(${PHOTO_COLUMNS})`,
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toLetter);
}

export async function getAdminSettings(): Promise<SiteSettings & { heroPhoto: AdminPhoto | null }> {
  const supabase = await adminClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  const byKey = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  const settings: SiteSettings = {
    hero: parseSetting("hero", byKey.get("hero") ?? defaultSettings.hero),
    home: parseSetting("home", byKey.get("home") ?? defaultSettings.home),
    features: parseSetting("features", byKey.get("features") ?? defaultSettings.features),
  };
  let heroPhoto: AdminPhoto | null = null;
  if (settings.hero.photoId) {
    const { data: row } = await supabase
      .from("photos")
      .select(`${PHOTO_COLUMNS}, bytes, original_filename, created_at, photo_albums(album_id)`)
      .eq("id", settings.hero.photoId)
      .maybeSingle();
    heroPhoto = row ? toAdminPhoto(row) : null;
  }
  return { ...settings, heroPhoto };
}

export async function getOverview() {
  const supabase = await adminClient();
  const count = async (table: string, apply?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (apply) q = apply(q);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [photos, publishedPhotos, videos, events, pendingLetters, albums] = await Promise.all([
    count("photos"),
    count("photos", (q) => q.eq("published", true)),
    count("videos"),
    count("timeline_events"),
    count("letters", (q) => q.eq("status", "pending")),
    count("albums"),
  ]);
  return { photos, publishedPhotos, videos, events, pendingLetters, albums };
}
