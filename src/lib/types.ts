// Shapes shared by public pages and the admin dashboard.

export type Photo = {
  id: string;
  publicId: string;
  version: number;
  width: number;
  height: number;
  caption: string | null;
  alt: string | null;
  takenOn: string | null;
  tags: string[];
  isFavourite: boolean;
  allowDownload: boolean;
  published: boolean;
  position: number;
  /** Present only for placeholder tiles shown before real photos exist. */
  placeholder?: boolean;
};

export type Album = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  position: number;
  published: boolean;
};

export type Video = {
  id: string;
  publicId: string;
  version: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  title: string | null;
  caption: string | null;
  recordedOn: string | null;
  posterPublicId: string | null;
  posterVersion: number | null;
  posterOffset: number | null;
  isFeatured: boolean;
  published: boolean;
  position: number;
  albumIds: string[];
  placeholder?: boolean;
};

export type DatePrecision = "day" | "month" | "year";

export type TimelineMedia =
  | { kind: "photo"; photo: Photo }
  | { kind: "video"; video: Video };

export type TimelineEvent = {
  id: string;
  eventDate: string;
  datePrecision: DatePrecision;
  title: string;
  story: string | null;
  published: boolean;
  media: TimelineMedia[];
};

export type StorySection = {
  id: string;
  slug: string;
  title: string;
  body: string;
  photo: Photo | null;
  position: number;
  published: boolean;
};

export type LittleThing = {
  id: string;
  slug: string;
  title: string;
  body: string;
  emoji: string | null;
  photo: Photo | null;
  position: number;
  published: boolean;
};

export type LetterStatus = "pending" | "approved" | "rejected";
export type LetterVisibility = "public" | "private";

export type Letter = {
  id: string;
  authorName: string;
  body: string;
  letterDate: string;
  photo: Photo | null;
  visibility: LetterVisibility;
  status: LetterStatus;
  writtenByAdmin: boolean;
  createdAt: string;
};

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };
