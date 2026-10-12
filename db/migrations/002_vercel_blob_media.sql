-- Media files now live in Vercel Blob (uploaded straight from the browser,
-- with web-sized copies made in the browser) instead of Cloudinary.
--
-- photos.variants: resized copies for responsive images, e.g.
--   [{ "w": 480, "url": "https://…/w480.webp" }, { "w": 960, "url": "…" }, …]
-- storage_key: the Blob folder holding all of a photo's or video's files.
--
-- Rows recorded for Cloudinary can't be shown any more, so they are removed.

delete from public.photos;
delete from public.videos;

alter table public.photos rename column public_id to storage_key;
alter table public.photos drop column version;
alter table public.photos add column original_url text not null check (original_url like 'https://%');
alter table public.photos add column variants jsonb not null default '[]' check (jsonb_typeof(variants) = 'array');
alter table public.photos add column content_type text check (char_length(content_type) <= 100);

alter table public.videos rename column public_id to storage_key;
alter table public.videos
  drop column version,
  drop column poster_public_id,
  drop column poster_version,
  drop column poster_offset;
alter table public.videos add column video_url text not null check (video_url like 'https://%');
alter table public.videos add column content_type text check (char_length(content_type) <= 100);
alter table public.videos add column poster_url text check (poster_url like 'https://%');
