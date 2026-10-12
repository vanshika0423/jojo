import type { LittleThing, Photo, StorySection, TimelineEvent, Video } from "@/lib/types";

// Elegant stand-ins shown until real memories are added in /admin.
// Nothing here describes Jojo — only empty frames waiting to be filled.

const ratios: Array<[number, number]> = [
  [4, 5],
  [3, 2],
  [1, 1],
  [2, 3],
  [4, 3],
  [3, 4],
  [16, 10],
  [4, 5],
  [5, 4],
];

export function placeholderPhotos(count: number, offset = 0): Photo[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + offset;
    const [w, h] = ratios[n % ratios.length];
    return {
      id: `placeholder-${n}`,
      publicId: "",
      version: 0,
      width: w * 300,
      height: h * 300,
      caption: null,
      alt: "A space waiting for a photograph of Jojo",
      takenOn: null,
      tags: [],
      isFavourite: false,
      allowDownload: false,
      published: true,
      position: n,
      placeholder: true,
    };
  });
}

export function placeholderVideos(count: number): Video[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `placeholder-video-${i}`,
    publicId: "",
    version: 0,
    width: 1600,
    height: 900,
    duration: null,
    title: null,
    caption: null,
    recordedOn: null,
    posterPublicId: null,
    posterVersion: null,
    posterOffset: null,
    isFeatured: i === 0,
    published: true,
    position: i,
    albumIds: [],
    placeholder: true,
  }));
}

export const defaultStorySections: StorySection[] = [
  ["the-day-we-met", "The Day We Met"],
  ["growing-up-with-jojo", "Growing Up With Jojo"],
  ["his-favourite-things", "His Favourite Things"],
  ["the-little-habits-we-loved", "The Little Habits We Loved"],
  ["our-adventures-together", "Our Adventures Together"],
  ["what-jojo-taught-us", "What Jojo Taught Us"],
].map(([slug, title], i) => ({
  id: `default-${slug}`,
  slug,
  title,
  body: "",
  photo: null,
  position: i + 1,
  published: true,
}));

export const defaultLittleThings: LittleThing[] = (
  [
    ["favourite-food", "Favourite food", "🍗"],
    ["favourite-toy", "Favourite toy", "🧸"],
    ["favourite-sleeping-place", "Favourite sleeping place", "🛏️"],
    ["favourite-person", "Favourite person", "💛"],
    ["funny-habits", "Funny habits", "😄"],
    ["favourite-walks", "Favourite walks", "🐾"],
    ["things-he-loved-doing", "Things he loved doing", "✨"],
  ] as const
).map(([slug, title, emoji], i) => ({
  id: `default-${slug}`,
  slug,
  title,
  body: "",
  emoji,
  photo: null,
  position: i + 1,
  published: true,
}));

export const defaultTimeline: TimelineEvent[] = [
  {
    id: "default-born",
    eventDate: "2017-03-11",
    datePrecision: "day",
    title: "Jojo is born",
    story: null,
    published: true,
    media: [],
  },
];

export const defaultAlbums = [
  ["puppy-days", "Puppy Days"],
  ["family-moments", "Family Moments"],
  ["adventures", "Adventures"],
  ["sleepy-jojo", "Sleepy Jojo"],
  ["funny-moments", "Funny Moments"],
  ["everyday-magic", "Everyday Magic"],
].map(([slug, name], i) => ({
  id: `default-${slug}`,
  slug,
  name,
  description: null,
  coverPhotoId: null,
  position: i + 1,
  published: true,
}));
