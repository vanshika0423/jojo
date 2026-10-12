// Shapes shared by public pages and the admin dashboard.

/** A resized copy of a photo, `w` pixels wide. */
export type ImageVariant = { w: number; url: string };

export type Photo = {
  id: string;
  /** The untouched file as uploaded (used for downloads). */
  originalUrl: string;
  /** Web-sized copies, smallest first, for responsive images. */
  variants: ImageVariant[];
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
  videoUrl: string;
  contentType: string | null;
  /** Thumbnail image (made from a frame at upload, or uploaded separately). */
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  title: string | null;
  caption: string | null;
  recordedOn: string | null;
  isFeatured: boolean;
  published: boolean;
  position: number;
  albumIds: string[];
  placeholder?: boolean;
};

export type DatePrecision = "day" | "month" | "year";

export type TimelineMedia = { kind: "photo"; photo: Photo } | { kind: "video"; video: Video };

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
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

export type AdminPhoto = Photo & {
  albumIds: string[];
  bytes: number | null;
  originalFilename: string | null;
  createdAt: string;
};

/** A photo uploaded from the dashboard, sent to the server to be saved. */
export type PhotoUpload = {
  /** Blob folder, e.g. "forever-jojo/photos/<uuid>". */
  key: string;
  originalUrl: string;
  contentType: string;
  variants: ImageVariant[];
  width: number;
  height: number;
  originalFilename: string;
};

/** A video uploaded from the dashboard, sent to the server to be saved. */
export type VideoUpload = {
  key: string;
  videoUrl: string;
  contentType: string;
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  originalFilename: string;
};
