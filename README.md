# Forever Jojo ♾️

A permanent digital home for **Jojo**, our Indian Spitz — born 11 March 2017, forever ours.

A warm, cinematic photo journal: a full-screen homepage, a gallery built for thousands of photographs, his story,
a timeline of his life, videos, letters from the family, and the little things that made him _him_ — plus a private
dashboard at `/admin` where everything can be changed without touching code.

> The site is fully designed and works **before** any photos or words are added. Every empty spot shows an elegant,
> clearly marked placeholder. Nothing about Jojo has been invented — the only fact built in is his birthday.

---

## Contents

1. [What’s inside](#whats-inside)
2. [Technology](#technology)
3. [Setup guide](#setup-guide) — PostgreSQL, Vercel Blob, running locally
4. [Deploying to Vercel](#deploying-to-vercel)
5. [Using the dashboard](#using-the-dashboard)
6. [How it works](#how-it-works) — security, performance, media
7. [Project structure](#project-structure)
8. [Maintenance & troubleshooting](#maintenance--troubleshooting)

---

## What’s inside

| Page                               | What it does                                                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home** `/`                       | Full-screen hero photograph with gentle parallax, introduction, featured memories, a horizontal photo strip, featured video, timeline preview, “The Little Things”, and “Forever our Jojo ♾️”.                                                                |
| **Memories** `/memories`           | “A Thousand Little Moments” — responsive masonry gallery with infinite scroll, albums, favourites, caption/tag search, and a full-screen lightbox (swipe on phones, arrow keys on desktop, optional downloads). Links like `?album=adventures` are shareable. |
| **His Story** `/story`             | Editorial chapters with large photographs between them. Six chapters are ready to be written.                                                                                                                                                                 |
| **Timeline** `/timeline`           | Milestones from March 2017 onwards, grouped by year with a sticky year bar and an animated line. Each milestone can hold photos and videos.                                                                                                                   |
| **Videos** `/videos`               | “Jojo in Motion” — poster thumbnails, album filters, full-screen player with phone-sized and desktop-sized renditions.                                                                                                                                        |
| **Letters** `/letters`             | Family letters shown like journal pages. Visitors can write a letter; **nothing appears until you approve it**, and letters can be kept private.                                                                                                              |
| **Little Things** `/little-things` | Playful cards: favourite food, toy, sleeping place, person, funny habits, walks, things he loved doing.                                                                                                                                                       |
| **Dashboard** `/admin`             | Private, sign-in only. Upload, organise, write, publish.                                                                                                                                                                                                      |

Also: Open Graph share image (uses the hero photo), sitemap, robots rules that keep `/admin` out of search engines,
skip-link and keyboard navigation, reduced-motion support everywhere, and a soft film-grain texture.

## Technology

| Piece       | Used for                                                   | Version                            |
| ----------- | ---------------------------------------------------------- | ---------------------------------- |
| Next.js     | App Router, Cache Components, Server Actions, `proxy.ts`   | 16.4                               |
| React       | UI                                                         | 19.3                               |
| TypeScript  | Types                                                      | 5.x                                |
| Tailwind    | Styling (`@theme` design tokens in `src/app/globals.css`)  | 4.x                                |
| Motion      | Animations (`motion/react`, formerly Framer Motion)        | 14.x                               |
| PostgreSQL  | All text, albums, captions, letters, settings and sign-ins | any PostgreSQL 13+, `postgres` 3.x |
| Vercel Blob | Storing photos (originals + web-sized copies) and videos   | @vercel/blob 2.x                   |
| Zod         | Validating every input on the server                       | 4.x                                |
| Supabase    | _Optional_ — sign in with Supabase Auth instead            | @supabase/ssr 0.12                 |
| Vercel      | Hosting                                                    | —                                  |

Node.js **20.9 or newer** is required.

---

## Setup guide

You need a **PostgreSQL database** and a [Vercel](https://vercel.com) account (for file storage with Vercel Blob,
and to put the site online). Allow about 20 minutes.

### 1. PostgreSQL (database and sign-in)

**a) Get a database.** Any PostgreSQL 13 or newer works. For a site that family can visit online, use a hosted one —
for example [Neon](https://neon.tech) (free tier; pick the region closest to India — Mumbai if offered, otherwise Singapore),
[Railway](https://railway.app), Vercel Postgres, or the database of a Supabase project. Create a database and copy its
**connection string** — it looks like:

```
postgresql://user:password@host/dbname?sslmode=require
```

For testing on your own computer you can also use a local PostgreSQL, e.g.
`postgresql://postgres:your-password@localhost:5432/jojo` (create the empty `jojo` database first, for example with
pgAdmin, or `createdb -U postgres jojo`).

**b) Add it to `.env.local`.** In the project folder:

```bash
cp .env.example .env.local        # Windows PowerShell: copy .env.example .env.local
```

Open `.env.local` and set `DATABASE_URL` to your connection string.

**c) Create the tables.**

```bash
npm install
npm run db:migrate
```

This creates every table plus the default albums, the six story chapters, the seven “little things” cards and the
one milestone we know — the day Jojo was born. It’s safe to run again; it only applies what’s new.

**d) Create your dashboard login.**

```bash
npm run db:create-admin
```

Type your email and a password (at least 10 characters; it’s hidden as you type). Run it again for each family
member who should have access — or with an existing email to change its password.

### 2. Vercel Blob (photos and videos)

Photos and videos are stored in [Vercel Blob](https://vercel.com/docs/vercel-blob).

1. Sign in at <https://vercel.com> (it’s easiest to first import this GitHub repository as a project — see
   [Deploying to Vercel](#deploying-to-vercel)).
2. Open the **Storage** tab → **Create** → **Blob**, give it a name (e.g. `jojo-media`) and connect it to your
   project. Vercel adds the `BLOB_READ_WRITE_TOKEN` variable to the project automatically.
3. For running on your computer, copy that token too: in the Blob store’s page open **`.env.local`** (or
   **Settings**), copy `BLOB_READ_WRITE_TOKEN=…` and paste it into your `.env.local`.

How uploads work: when you add photos in the dashboard, **your browser** makes small web-sized copies (480, 960, 1600
and 2400 px wide, in WebP) and uploads them together with the untouched original. Visitors only ever download the
small copies. Videos are stored and played exactly as uploaded — MP4 (H.264) plays everywhere; some iPhone `.mov`
(HEVC) files don’t play in Chrome on Windows, so export those as MP4 if needed. A thumbnail is taken from the video
automatically (you can upload your own).

Blob storage is free up to your plan’s limits; check usage in the Blob store’s page on Vercel.

### 3. Run it on your computer

With `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` in `.env.local`:

```bash
npm run dev
```

Open <http://localhost:3000> for the site and <http://localhost:3000/admin> for the dashboard.

Without a database the site still runs and shows its placeholders, so you can look around first.

| Variable                          | Where it comes from                         | Secret? |
| --------------------------------- | ------------------------------------------- | ------- |
| `NEXT_PUBLIC_SITE_URL`            | Your domain, e.g. `https://foreverjojo.com` | no      |
| `DATABASE_URL`                    | Your PostgreSQL connection string           | **yes** |
| `BLOB_READ_WRITE_TOKEN`           | Vercel → Storage → your Blob store          | **yes** |
| `NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB` | Largest photo you can upload, default 30    | no      |
| `NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB` | Largest video you can upload, default 500   | no      |
| `DATABASE_POOL_SIZE` _(optional)_ | Connections per server instance, default 5  | no      |

### Optional: sign in with Supabase Auth

The built-in sign-in is all you need. If you’d rather manage logins with Supabase Auth, set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project Settings → API Keys), create
the user in Supabase → Authentication → Users, turn off public sign-ups there, and add the same email to the database:

```sql
insert into public.admin_users (email) values ('you@example.com');
```

Content is still stored in your `DATABASE_URL` database either way (which can be the Supabase project’s own database).

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project**, import the repository. The framework (Next.js) is detected automatically.
3. Under **Environment Variables**, add every variable from the table above (use your real domain for
   `NEXT_PUBLIC_SITE_URL`, and your **hosted** database for `DATABASE_URL`). Apply them to **Production** and
   **Preview**.
4. Click **Deploy**.
5. Optional: add your own domain in Vercel → **Settings → Domains**, then update `NEXT_PUBLIC_SITE_URL` and redeploy.

Run `npm run db:migrate` (with `DATABASE_URL` pointing at the hosted database) whenever you update to a version with
new files in `db/migrations`.

`vercel.json` runs server functions in **Mumbai (`bom1`)**. Keep the database in a nearby region (Mumbai or
Singapore), or change `regions` to the Vercel region closest to your database.

After changing environment variables in Vercel, **redeploy** for them to take effect.

---

## Using the dashboard

Go to **`/admin`** and sign in. Every page explains itself; here’s the short version.

- **Photos** — drag photos onto the upload box (or tap **Choose photos** on a phone). Choose **Keep as drafts** (the
  default) or **Publish immediately**, and optionally pick albums first. Each file shows its own progress bar; failed
  files can be retried. Then click any photo to add a caption, date, tags and albums, mark it a favourite, allow
  downloads, publish it, replace the file, use it as the homepage photo, or delete it. Tick several photos to publish,
  favourite, add to an album or delete them together. Drag photos (in the “All” view) to change their order on the
  website.
- **Albums** — create, rename, reorder (▲▼), hide or delete albums; choose a cover. “All Memories” and “Our
  Favourites” are automatic. Deleting an album never deletes its photos.
- **Videos** — upload, add a title, caption and date, choose a thumbnail (upload an image, or pick the second it
  should be taken from), feature one on the homepage, publish, reorder, replace or delete.
- **His Story** — six chapters ready for your words, each with a large photograph. Add, reorder or hide chapters.
- **Timeline** — add milestones with a date (exact day, month only or year only), title, story, photos and videos.
- **Letters** — approve letters sent from the website, keep them private, edit them, or write your own.
- **Little Things** — fill in the cards and pick an emoji or photo for each.
- **Homepage & Settings** — the hero photograph and words, the introduction, closing words, whether downloads are
  allowed, and whether visitors can send letters.

Changes appear on the website within seconds of saving.

**Photo tips:** phone photos (JPG) are perfect — no need to resize. The original file is kept untouched; visitors
get a smaller copy sized for their screen. iPhone HEIC photos may need exporting as JPG first (Chrome on Windows can’t
read HEIC). Wide landscape photos work best for the homepage hero.

---

## How it works

### Security

- **Only the server talks to the database.** Visitors’ browsers never get database access; public pages only ever
  query _published_ content, and visitors can only create letters as _pending_.
- **Every admin page and server action re-checks the session** (`src/lib/auth.ts`: `requireAdmin` / `assertAdmin`)
  against the database — `proxy.ts` only redirects signed-out visitors early for convenience.
- **Sign-in:** passwords are stored as salted **scrypt** hashes; failed attempts take the same time whether or not the
  email exists. A successful sign-in sets a random 256-bit token in an `httpOnly`, `SameSite=Lax` cookie (HTTPS-only
  in production); only its SHA-256 hash is stored, and signing out deletes it. Sessions last 30 days.
- **All input is validated with Zod** on the server (`src/app/admin/actions/*`), every query is parameterised, and
  each change runs in a single transaction.
- **Secrets never reach the browser.** `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` are only used server-side (guarded
  by `server-only`). Browsers upload directly to Vercel Blob with a short-lived token from `/api/blob`, which is only
  issued to a signed-in admin, for one validated file path, allowed file types and a maximum size. Before saving,
  the server **checks every file really exists in your Blob store**, inside that upload’s own folder.
- Uploaded files have unguessable addresses, but anyone who has a file’s exact address can open it (that’s how public
  websites serve images). Keep truly private photos out of the site.
- Row level security is enabled (with no policies) on every table, so if the database is hosted on Supabase its
  automatic public API can’t read or change anything.
- The site sends `X-Frame-Options`, `nosniff`, a strict referrer policy and `X-Robots-Tag: noindex` on `/admin`;
  `robots.txt` disallows `/admin` and `/api/`.
- The public letter form has a hidden spam trap and a minimum-time check.

### Performance

- Public pages are **prerendered** and cached with Next.js Cache Components (`'use cache'` + `cacheTag`). Saving in
  the dashboard calls `updateTag(...)`, so changes show up immediately without rebuilding.
- Photos are served as **web-sized WebP copies** made at upload (480–2400 px) with a responsive `srcset`, so phones
  download small files; images below the fold load lazily, and only the hero image loads eagerly.
- The gallery loads 40 photos at a time with infinite scroll, so it stays fast with thousands of photos.
- Videos stream with HTTP range requests; nothing downloads until a visitor presses play, and thumbnails are small
  images. Shorter or smaller clips load faster on mobile networks.
- Animations are transform/opacity only and switch off with “reduce motion”.

### Media storage

- Each photo or video gets its own folder in Vercel Blob (`forever-jojo/photos/<id>/…`), holding the untouched
  original and its web-sized copies. Deleting or replacing media in the dashboard also removes the old files.
- Photo order uses fractional positions, so moving one photo updates one row.

---

## Project structure

```
src/
  app/
    (site)/            Public pages (home, memories, story, timeline, videos, letters, little-things)
    admin/
      login/           Sign-in page
      (dashboard)/     Protected dashboard pages (layout re-checks admin access)
      actions/         Server actions: auth, media (uploads/photos/videos), content (everything else)
    api/photos/        Read-only gallery paging (published photos only)
    api/blob/          Upload tokens for Vercel Blob (admins only)
    opengraph-image.tsx, sitemap.ts, robots.ts, icon.svg
  components/
    site/ home/ gallery/ video/ timeline/ letters/ media/ motion/   Public UI
    admin/                                                          Dashboard UI
  lib/
    data/public.ts     Cached public readers (+ placeholders when not configured)
    data/admin.ts      Dashboard readers (admin-checked)
    db/                PostgreSQL connection
    storage/blob.ts    Vercel Blob checks and deletes (server-only)
    upload-client.ts   In-browser resizing and uploads
    media.ts           srcset / download helpers
    supabase/          Optional Supabase Auth client
    auth.ts            Sign-in, sessions, requireAdmin / assertAdmin
    password.ts        scrypt password hashing
    settings.ts        Editable site text and options, with defaults
  proxy.ts             Early redirect for /admin (and Supabase session refresh)
db/migrations/         Database schema and default content (npm run db:migrate)
scripts/               db-migrate and create-admin commands
```

## Maintenance & troubleshooting

```bash
npm run check            # lint + type check + formatting
npm run build            # production build
npm run db:migrate       # apply new database migrations
npm run db:create-admin  # add an admin or change a password
```

| Problem                                            | Fix                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Sign-in page says the database isn’t connected     | Set `DATABASE_URL`, run `npm run db:migrate`, then restart (`npm run dev`) or redeploy.       |
| “That email and password didn’t work”              | Run `npm run db:create-admin` with that email to set a new password.                          |
| Forgot the password                                | Same: `npm run db:create-admin` resets it and signs out old sessions.                         |
| `db:migrate` can’t connect                         | Check the connection string; hosted databases usually need `?sslmode=require` at the end.     |
| “Vercel Blob isn’t connected yet” in the dashboard | Add `BLOB_READ_WRITE_TOKEN` to `.env.local` (or Vercel) and restart / redeploy.               |
| Upload says the file is too large                  | Compress it, or raise `NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB` / `NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB`.  |
| “This browser can’t read this photo”               | It’s probably an iPhone HEIC photo: export it as JPG (or upload from Safari on a Mac/iPhone). |
| A video won’t play in Chrome                       | Probably iPhone HEVC: export it as MP4 (H.264) and use **Replace video**.                     |
| A photo doesn’t appear on the website              | It’s probably still a **Draft** — open it and switch on **Published**.                        |
| Share preview shows the old photo                  | Social networks cache previews; use their “debug/refresh preview” tools.                      |

Good to know:

- **Downloads:** the download button only appears when you allow it, but anyone can still screenshot a photo they can
  see. Keep truly private photos unpublished.
- **Private letters** are visible only in the dashboard, never on the website.
- To keep a backup, use your database host’s backups or `pg_dump "$DATABASE_URL" > jojo-backup.sql`; Vercel Blob keeps
  every original you upload (keep your own copies of precious photos too).

---

Made with endless love for Jojo ♾️
