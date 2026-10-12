// Cache tags for public content. Admin actions call updateTag() with these.
export const TAGS = {
  photos: "photos",
  albums: "albums",
  videos: "videos",
  timeline: "timeline",
  story: "story",
  littleThings: "little-things",
  letters: "letters",
  settings: "settings",
} as const;

export type CacheTag = (typeof TAGS)[keyof typeof TAGS];
