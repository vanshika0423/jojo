import type {
  Album,
  Letter,
  LittleThing,
  Photo,
  StorySection,
  TimelineEvent,
  TimelineMedia,
  Video,
} from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from PostgREST */
type Row = Record<string, any>;

export const PHOTO_COLUMNS =
  "id, public_id, version, width, height, caption, alt, taken_on, tags, is_favourite, allow_download, published, position";

export const VIDEO_COLUMNS =
  "id, public_id, version, width, height, duration, title, caption, recorded_on, poster_public_id, poster_version, poster_offset, is_featured, published, position";

export function toPhoto(row: Row): Photo {
  return {
    id: row.id,
    publicId: row.public_id,
    version: Number(row.version),
    width: row.width,
    height: row.height,
    caption: row.caption ?? null,
    alt: row.alt ?? null,
    takenOn: row.taken_on ?? null,
    tags: row.tags ?? [],
    isFavourite: Boolean(row.is_favourite),
    allowDownload: Boolean(row.allow_download),
    published: Boolean(row.published),
    position: Number(row.position ?? 0),
  };
}

export function toPhotoOrNull(row: Row | null | undefined): Photo | null {
  return row ? toPhoto(row) : null;
}

export function toAlbum(row: Row): Album {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    coverPhotoId: row.cover_photo_id ?? null,
    position: row.position ?? 0,
    published: Boolean(row.published),
  };
}

export function toVideo(row: Row): Video {
  return {
    id: row.id,
    publicId: row.public_id,
    version: Number(row.version),
    width: row.width ?? null,
    height: row.height ?? null,
    duration: row.duration != null ? Number(row.duration) : null,
    title: row.title ?? null,
    caption: row.caption ?? null,
    recordedOn: row.recorded_on ?? null,
    posterPublicId: row.poster_public_id ?? null,
    posterVersion: row.poster_version != null ? Number(row.poster_version) : null,
    posterOffset: row.poster_offset != null ? Number(row.poster_offset) : null,
    isFeatured: Boolean(row.is_featured),
    published: Boolean(row.published),
    position: Number(row.position ?? 0),
    albumIds: Array.isArray(row.video_albums) ? row.video_albums.map((a: Row) => a.album_id) : [],
  };
}

export function toTimelineEvent(row: Row): TimelineEvent {
  const media: TimelineMedia[] = [...(row.timeline_event_media ?? [])]
    .sort((a: Row, b: Row) => a.position - b.position)
    .flatMap((m: Row): TimelineMedia[] => {
      if (m.photo) return [{ kind: "photo", photo: toPhoto(m.photo) }];
      if (m.video) return [{ kind: "video", video: toVideo(m.video) }];
      return [];
    });
  return {
    id: row.id,
    eventDate: row.event_date,
    datePrecision: row.date_precision,
    title: row.title,
    story: row.story ?? null,
    published: Boolean(row.published),
    media,
  };
}

export function toStorySection(row: Row): StorySection {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body ?? "",
    photo: toPhotoOrNull(row.photo),
    position: row.position ?? 0,
    published: Boolean(row.published),
  };
}

export function toLittleThing(row: Row): LittleThing {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body ?? "",
    emoji: row.emoji ?? null,
    photo: toPhotoOrNull(row.photo),
    position: row.position ?? 0,
    published: Boolean(row.published),
  };
}

export function toLetter(row: Row): Letter {
  return {
    id: row.id,
    authorName: row.author_name,
    body: row.body,
    letterDate: row.letter_date,
    photo: toPhotoOrNull(row.photo),
    visibility: row.visibility,
    status: row.status,
    writtenByAdmin: Boolean(row.written_by_admin),
    createdAt: row.created_at,
  };
}
