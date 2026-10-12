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
3. [Setup guide](#setup-guide) — Supabase, Cloudinary, running locally
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

| Piece      | Used for                                                      | Version                             |
| ---------- | ------------------------------------------------------------- | ----------------------------------- |
| Next.js    | App Router, Cache Components, Server Actions, `proxy.ts`      | 16.4                                |
| React      | UI                                                            | 19.3                                |
| TypeScript | Types                                                         | 5.x                                 |
| Tailwind   | Styling (`@theme` design tokens in `src/app/globals.css`)     | 4.x                                 |
| Motion     | Animations (`motion/react`, formerly Framer Motion)           | 14.x                                |
| Supabase   | Postgres database, row level security, email/password sign-in | supabase-js 2.x, @supabase/ssr 0.12 |
| Cloudinary | Storing originals, optimised image & video delivery           | cloudinary 2.x (server SDK)         |
| Zod        | Validating every input on the server                          | 4.x                                 |
| Vercel     | Hosting                                                       | —                                   |

Node.js **20.9 or newer** is required.

---

## Setup guide

You’ll need free accounts at [Supabase](https://supabase.com), [Cloudinary](https://cloudinary.com) and
[Vercel](https://vercel.com). Allow about 20 minutes.

### 1. Supabase (database and sign-in)

1. **Create a project** at <https://supabase.com/dashboard>. For visitors in India choose the **Mumbai
   (ap-south-1)** region. Save the database password somewhere safe.
2. **Create the tables.** Open **SQL Editor → New query**, paste the whole contents of
   [`supabase/migrations/20261012000000_initial_schema.sql`](supabase/migrations/20261012000000_initial_schema.sql)
   and press **Run**. This creates every table, the security policies, the default albums, the six story chapters,
   the seven “little things” cards and the one milestone we know — the day Jojo was born.
   _(If you use the Supabase CLI instead: `supabase link` then `supabase db push`.)_
3. **Turn off public sign-ups.** **Authentication → Sign In / Providers → Email**: keep Email enabled, and turn
   **off** “Allow new users to sign up”. (Even if someone did sign up, they couldn’t change anything — but there’s
   no reason to allow it.)
4. **Create your account.** **Authentication → Users → Add user → Create new user**. Enter your email and a strong
   password, and tick **Auto confirm user**.
5. **Make yourself an administrator.** Back in the **SQL Editor**, run (with your email):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

   Repeat for any other family member who should have access.

6. **Copy your keys.** **Project Settings → API Keys** (or **API**): you need the **Project URL** and the
   **publishable key** (`sb_publishable_…`; the legacy `anon` key also works). You do **not** need the secret /
   service-role key — don’t add it anywhere.

### 2. Cloudinary (photos and videos)

1. Sign up at <https://cloudinary.com>. Your **cloud name**, **API key** and **API secret** are on the console’s
   dashboard / **Settings → API Keys**.
2. That’s it — the site creates its own folders (`forever-jojo/photos`, `/videos`, `/posters`).
3. Check your plan’s upload limits (**Settings → Usage / Plan**). On the Free plan images can be up to **10 MB** and
   videos up to **100 MB**; set `NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB` / `NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB` to match so
   the dashboard warns before uploading. Larger videos are sent in 20 MB pieces automatically.

### 3. Run it on your computer

```bash
npm install
cp .env.example .env.local   # then fill in the values from steps 1–2
npm run dev
```

Open <http://localhost:3000> for the site and <http://localhost:3000/admin> for the dashboard.

Without any keys the site still runs and shows its placeholders, so you can look around first.

| Variable                               | Where it comes from                         | Secret?               |
| -------------------------------------- | ------------------------------------------- | --------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | Your domain, e.g. `https://foreverjojo.com` | no                    |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase → Project Settings → API           | no                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys      | no (protected by RLS) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`    | Cloudinary dashboard                        | no                    |
| `CLOUDINARY_API_KEY`                   | Cloudinary → Settings → API Keys            | **yes**               |
| `CLOUDINARY_API_SECRET`                | Cloudinary → Settings → API Keys            | **yes**               |
| `CLOUDINARY_FOLDER` _(optional)_       | Folder name, default `forever-jojo`         | no                    |
| `NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB`      | Your Cloudinary plan’s image limit          | no                    |
| `NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB`      | Your Cloudinary plan’s video limit          | no                    |

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project**, import the repository. The framework (Next.js) is detected automatically.
3. Under **Environment Variables**, add every variable from the table above (use your real domain for
   `NEXT_PUBLIC_SITE_URL`). Apply them to **Production** and **Preview**.
4. Click **Deploy**.
5. In Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel domain.
6. Optional: add your own domain in Vercel → **Settings → Domains**, then update `NEXT_PUBLIC_SITE_URL` and redeploy.

`vercel.json` runs server functions in **Mumbai (`bom1`)**, next to a Mumbai Supabase project. If your Supabase project
is in another region, change `regions` to the nearest Vercel region.

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

**Photo tips:** phone photos (JPG/HEIC) are perfect — no need to resize. The original file is kept untouched in
Cloudinary; visitors get a smaller, modern-format copy sized for their screen. Wide landscape photos work best for the
homepage hero.

---

## How it works

### Security

- **Database rules (RLS) are the real lock.** Visitors can only read _published_ content, and can only insert letters
  as _pending_. Every write requires a signed-in user listed in `public.admins` — checked by the database itself
  (`public.is_admin()`), so it holds even if someone calls Supabase directly with the public key.
- **Every admin page and server action re-checks the user.** `proxy.ts` refreshes the session and redirects signed-out
  visitors early, but authorisation happens in `src/lib/auth.ts` (`requireAdmin` / `assertAdmin`): the JWT is verified
  with `getClaims()` and admin membership is looked up in the database.
- **All input is validated with Zod** on the server (`src/app/admin/actions/*`).
- **Secrets never reach the browser.** The Cloudinary API secret is only used server-side (`src/lib/cloudinary/server.ts`,
  guarded by `server-only`). Browsers upload directly to Cloudinary with a short-lived signature for exactly the
  allowed parameters, and the server **verifies Cloudinary’s response signature** before saving anything.
- The site sends `X-Frame-Options`, `nosniff`, a strict referrer policy and `X-Robots-Tag: noindex` on `/admin`;
  `robots.txt` disallows `/admin` and `/api/`.
- The public letter form has a hidden spam trap and a minimum-time check.

### Performance

- Public pages are **prerendered** and cached with Next.js Cache Components (`'use cache'` + `cacheTag`). Saving in
  the dashboard calls `updateTag(...)`, so changes show up immediately without rebuilding.
- Images use `next/image` with a **Cloudinary loader**: responsive `srcset`, lazy loading, `f_auto` (AVIF/WebP) and
  `q_auto`. Only the hero image is preloaded.
- The gallery loads 40 photos at a time with infinite scroll, so it stays fast with thousands of photos.
- Videos are pre-encoded at upload time into **720p (phones)** and **1280p** MP4 renditions (`q_auto`, `vc_auto`) and
  streamed with HTTP range requests; nothing downloads until a visitor presses play, and posters are lightweight images.
- Animations are transform/opacity only and switch off with “reduce motion”.

### Media storage

- Originals are preserved in Cloudinary under `forever-jojo/…`. Deleting or replacing media in the dashboard also
  removes the old file from Cloudinary.
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
    opengraph-image.tsx, sitemap.ts, robots.ts, icon.svg
  components/
    site/ home/ gallery/ video/ timeline/ letters/ media/ motion/   Public UI
    admin/                                                          Dashboard UI
  lib/
    data/public.ts     Cached public readers (+ placeholders when not configured)
    data/admin.ts      Dashboard readers (run as the signed-in user)
    cloudinary/        URL builders (browser-safe) and signing/deleting (server-only)
    supabase/          Public (cookie-less) and request (cookie) clients
    auth.ts            requireAdmin / assertAdmin
    settings.ts        Editable site text and options, with defaults
  proxy.ts             Session refresh + early redirect for /admin
supabase/migrations/   Database schema, RLS policies, default content
```

## Maintenance & troubleshooting

```bash
npm run check   # lint + type check + formatting
npm run build   # production build
```

| Problem                                            | Fix                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| “This account isn’t an administrator”              | Run the `insert into public.admins …` SQL from setup step 1.5 for that email.                       |
| Sign-in page says Supabase isn’t configured        | Add the `NEXT_PUBLIC_SUPABASE_*` variables and redeploy.                                            |
| “Cloudinary isn’t configured yet” in the dashboard | Add the three `CLOUDINARY_*` / cloud-name variables and redeploy.                                   |
| Upload says the file is too large                  | Your Cloudinary plan limit — compress the file, or upgrade and raise `NEXT_PUBLIC_MAX_*_UPLOAD_MB`. |
| A photo doesn’t appear on the website              | It’s probably still a **Draft** — open it and switch on **Published**.                              |
| Share preview shows the old photo                  | Social networks cache previews; use their “debug/refresh preview” tools.                            |

Good to know:

- **Downloads:** the download button only appears when you allow it, but anyone can still screenshot a photo they can
  see. Keep truly private photos unpublished.
- **Private letters** are visible only in the dashboard, never on the website.
- To keep a backup, Supabase offers database backups (paid plans) or `supabase db dump`; Cloudinary keeps every
  original you upload.

---

Made with endless love for Jojo ♾️
