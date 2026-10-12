-- Forever Jojo ♾️ — PostgreSQL schema (works on any PostgreSQL 13+)
--
-- Security model
--   * Only the website's server connects to this database (DATABASE_URL).
--     Every page and action checks permissions on the server before querying.
--   * Row level security is switched ON with no policies. The table owner
--     (your DATABASE_URL user) is unaffected, but if the database is hosted on
--     Supabase this keeps its automatic public API from exposing any table.

create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrators and sign-in sessions
-- ---------------------------------------------------------------------------

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) between 3 and 320),
  -- scrypt hash, set by `npm run db:create-admin`. Null when the account signs
  -- in through Supabase Auth instead.
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index admin_users_email_idx on public.admin_users (email);

create trigger admin_users_updated_at before update on public.admin_users
  for each row execute function public.set_updated_at();

create table public.admin_sessions (
  -- SHA-256 of the random token kept in the browser cookie; the token itself
  -- is never stored.
  token_hash text primary key,
  admin_id uuid not null references public.admin_users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index admin_sessions_admin_idx on public.admin_sessions (admin_id);

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (char_length(public_id) between 1 and 300),
  version bigint not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  format text,
  bytes bigint,
  original_filename text check (char_length(original_filename) <= 300),
  caption text check (char_length(caption) <= 1000),
  alt text check (char_length(alt) <= 300),
  taken_on date,
  tags text[] not null default '{}',
  is_favourite boolean not null default false,
  allow_download boolean not null default true,
  published boolean not null default false,
  -- Fractional ordering: smaller comes first. New uploads go to the top.
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index photos_published_position_idx on public.photos (published, position, created_at desc);
create index photos_favourite_idx on public.photos (is_favourite) where is_favourite;
create index photos_tags_idx on public.photos using gin (tags);
create index photos_caption_trgm_idx on public.photos using gin (caption gin_trgm_ops);

create trigger photos_updated_at before update on public.photos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Albums (shared by photos and videos)
-- ---------------------------------------------------------------------------

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  cover_photo_id uuid references public.photos (id) on delete set null,
  position integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger albums_updated_at before update on public.albums
  for each row execute function public.set_updated_at();

create table public.photo_albums (
  photo_id uuid not null references public.photos (id) on delete cascade,
  album_id uuid not null references public.albums (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, album_id)
);

create index photo_albums_album_idx on public.photo_albums (album_id);

-- ---------------------------------------------------------------------------
-- Videos
-- ---------------------------------------------------------------------------

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (char_length(public_id) between 1 and 300),
  version bigint not null,
  width integer,
  height integer,
  duration numeric,
  format text,
  bytes bigint,
  original_filename text check (char_length(original_filename) <= 300),
  title text check (char_length(title) <= 200),
  caption text check (char_length(caption) <= 1000),
  recorded_on date,
  -- Optional custom thumbnail (an image public_id in Cloudinary).
  poster_public_id text check (char_length(poster_public_id) <= 300),
  poster_version bigint,
  -- Otherwise, a frame from the video at this many seconds (null = auto).
  poster_offset numeric check (poster_offset >= 0),
  is_featured boolean not null default false,
  published boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index videos_published_position_idx on public.videos (published, position);

create trigger videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();

create table public.video_albums (
  video_id uuid not null references public.videos (id) on delete cascade,
  album_id uuid not null references public.albums (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, album_id)
);

create index video_albums_album_idx on public.video_albums (album_id);

-- ---------------------------------------------------------------------------
-- Timeline
-- ---------------------------------------------------------------------------

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null check (event_date >= date '2017-03-01'),
  date_precision text not null default 'day' check (date_precision in ('day', 'month', 'year')),
  title text not null check (char_length(title) between 1 and 200),
  story text check (char_length(story) <= 20000),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index timeline_events_date_idx on public.timeline_events (published, event_date);

create trigger timeline_events_updated_at before update on public.timeline_events
  for each row execute function public.set_updated_at();

create table public.timeline_event_media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.timeline_events (id) on delete cascade,
  photo_id uuid references public.photos (id) on delete cascade,
  video_id uuid references public.videos (id) on delete cascade,
  position integer not null default 0,
  check ((photo_id is null) <> (video_id is null))
);

create index timeline_event_media_event_idx on public.timeline_event_media (event_id, position);

-- ---------------------------------------------------------------------------
-- Story, little things, letters, settings
-- ---------------------------------------------------------------------------

create table public.story_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 30000),
  photo_id uuid references public.photos (id) on delete set null,
  position integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger story_sections_updated_at before update on public.story_sections
  for each row execute function public.set_updated_at();

create table public.little_things (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  emoji text check (char_length(emoji) <= 16),
  photo_id uuid references public.photos (id) on delete set null,
  position integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger little_things_updated_at before update on public.little_things
  for each row execute function public.set_updated_at();

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (char_length(author_name) between 1 and 100),
  body text not null check (char_length(body) between 1 and 10000),
  letter_date date not null default current_date,
  photo_id uuid references public.photos (id) on delete set null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  written_by_admin boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index letters_status_idx on public.letters (status, visibility, letter_date desc);

create trigger letters_updated_at before update on public.letters
  for each row execute function public.set_updated_at();

-- Never store secrets here: every row is publicly readable.
create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock tables to the server connection (see note at the top)
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.photos enable row level security;
alter table public.albums enable row level security;
alter table public.photo_albums enable row level security;
alter table public.videos enable row level security;
alter table public.video_albums enable row level security;
alter table public.timeline_events enable row level security;
alter table public.timeline_event_media enable row level security;
alter table public.story_sections enable row level security;
alter table public.little_things enable row level security;
alter table public.letters enable row level security;
alter table public.site_settings enable row level security;

-- ---------------------------------------------------------------------------
-- Default content (structure only — no invented stories)
-- ---------------------------------------------------------------------------

insert into public.albums (slug, name, position) values
  ('puppy-days', 'Puppy Days', 1),
  ('family-moments', 'Family Moments', 2),
  ('adventures', 'Adventures', 3),
  ('sleepy-jojo', 'Sleepy Jojo', 4),
  ('funny-moments', 'Funny Moments', 5),
  ('everyday-magic', 'Everyday Magic', 6);

insert into public.story_sections (slug, title, position) values
  ('the-day-we-met', 'The Day We Met', 1),
  ('growing-up-with-jojo', 'Growing Up With Jojo', 2),
  ('his-favourite-things', 'His Favourite Things', 3),
  ('the-little-habits-we-loved', 'The Little Habits We Loved', 4),
  ('our-adventures-together', 'Our Adventures Together', 5),
  ('what-jojo-taught-us', 'What Jojo Taught Us', 6);

insert into public.little_things (slug, title, emoji, position) values
  ('favourite-food', 'Favourite food', '🍗', 1),
  ('favourite-toy', 'Favourite toy', '🧸', 2),
  ('favourite-sleeping-place', 'Favourite sleeping place', '🛏️', 3),
  ('favourite-person', 'Favourite person', '💛', 4),
  ('funny-habits', 'Funny habits', '😄', 5),
  ('favourite-walks', 'Favourite walks', '🐾', 6),
  ('things-he-loved-doing', 'Things he loved doing', '✨', 7);

-- The one milestone we know: the day Jojo was born. Its story is left for the family.
insert into public.timeline_events (event_date, date_precision, title, published) values
  ('2017-03-11', 'day', 'Jojo is born', true);
