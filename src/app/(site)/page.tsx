import Link from "next/link";
import { FeaturedVideo } from "@/components/home/featured-video";
import { Hero } from "@/components/home/hero";
import { PhotoStrip } from "@/components/home/photo-strip";
import { PhotoFrame } from "@/components/media/photo-frame";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { EditablePlaceholder, RichText } from "@/components/site/rich-text";
import { SectionHeading } from "@/components/site/section-heading";
import { VideoPoster } from "@/components/video/video-poster";
import {
  getFeaturedPhotos,
  getFeaturedVideo,
  getLittleThings,
  getRecentPhotos,
  getSettings,
  getTimeline,
} from "@/lib/data/public";
import { placeholderPhotos, placeholderVideos } from "@/lib/data/placeholders";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export default async function HomePage() {
  const [settings, featured, recent, video, timeline, littleThings] = await Promise.all([
    getSettings(),
    getFeaturedPhotos(5),
    getRecentPhotos(14),
    getFeaturedVideo(),
    getTimeline(),
    getLittleThings(),
  ]);

  const featuredPhotos = featured.length ? featured : placeholderPhotos(5);
  const stripPhotos = recent.length ? recent : placeholderPhotos(8, 3);
  const featuredVideo = video ?? placeholderVideos(1)[0];
  const { hero, home } = settings;

  return (
    <>
      <Hero
        hero={hero}
        media={
          settings.heroPhoto ? (
            <PhotoFrame photo={settings.heroPhoto} sizes="100vw" priority className="object-[50%_35%]" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#6b5a4e] via-cocoa to-[#2f2722]">
              <span aria-hidden className="font-serif text-[40vw] leading-none text-ivory/[0.06] sm:text-[24rem]">
                ∞
              </span>
            </div>
          )
        }
      />

      {/* Introduction */}
      <section id="his-world" className="scroll-mt-0 px-6 py-24 sm:py-36">
        <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-[1fr_1.1fr] md:gap-20">
          <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-photo)] bg-cream">
            <Parallax className="absolute inset-0" strength={30}>
              <div className="relative h-full w-full">
                <PhotoFrame
                  photo={featuredPhotos[0]}
                  sizes="(min-width: 768px) 45vw, 100vw"
                  placeholderLabel="Jojo's portrait"
                />
              </div>
            </Parallax>
          </Reveal>
          <div>
            <Reveal>
              <p className="eyebrow">Indian Spitz · Born 11 March 2017</p>
              <h2 className="mt-5 text-5xl leading-tight text-cocoa sm:text-6xl">
                {home.introHeading || "Meet Jojo"}
              </h2>
            </Reveal>
            <Reveal delay={0.15} className="mt-8">
              <RichText
                text={home.introBody}
                placeholder="A short introduction to Jojo, in your own words."
              />
            </Reveal>
            <Reveal delay={0.25} className="mt-10">
              <Link href="/story" className="btn btn-ghost">
                Read his story <span aria-hidden>→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Featured memories */}
      <section className="bg-cream/50 px-5 py-24 sm:px-8 sm:py-32" aria-labelledby="featured-heading">
        <SectionHeading eyebrow="Featured memories" title={<span id="featured-heading">Moments we hold close</span>} />
        <div className="mx-auto mt-14 grid max-w-7xl grid-cols-2 gap-3 sm:gap-5 md:grid-cols-12 md:grid-rows-[repeat(2,minmax(0,18rem))]">
          {featuredPhotos.slice(0, 4).map((photo, i) => {
            const layout = [
              "col-span-2 aspect-[4/3] md:col-span-7 md:row-span-2 md:aspect-auto",
              "aspect-square md:col-span-5 md:aspect-auto",
              "aspect-square md:col-span-2 md:aspect-auto",
              "col-span-2 aspect-[16/9] md:col-span-3 md:aspect-auto",
            ][i];
            return (
              <Reveal
                key={photo.id}
                delay={i * 0.08}
                className={cn("photo-zoom relative overflow-hidden rounded-[var(--radius-photo)] bg-cream", layout)}
              >
                <Link href="/memories" className="absolute inset-0" aria-label={photo.caption ?? "See all memories"}>
                  <PhotoFrame
                    photo={photo}
                    sizes={i === 0 ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 30vw, 50vw"}
                    tone={i}
                  />
                </Link>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-12 text-center">
          <Link href="/memories" className="btn btn-primary">
            Wander through his memories <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Horizontal photo strip */}
      <section className="py-24 sm:py-32" aria-labelledby="strip-heading">
        <div className="mx-auto mb-12 flex max-w-7xl items-end justify-between gap-6 px-6 sm:px-10">
          <Reveal>
            <p className="eyebrow">A thousand little moments</p>
            <h2 id="strip-heading" className="mt-4 text-4xl text-cocoa sm:text-5xl">
              Everyday Jojo
            </h2>
          </Reveal>
          <Link href="/memories" className="hidden text-sm text-cocoa/70 underline-offset-4 hover:underline sm:block">
            View all
          </Link>
        </div>
        <PhotoStrip label="Recent photographs of Jojo">
          {stripPhotos.map((photo, i) => (
            <figure
              key={photo.id}
              className="photo-zoom w-[72vw] shrink-0 snap-start sm:w-[22rem]"
            >
              <div
                className="relative overflow-hidden rounded-[var(--radius-photo)] bg-cream"
                style={{ aspectRatio: `${photo.width} / ${photo.height}`, maxHeight: "28rem" }}
              >
                <PhotoFrame photo={photo} sizes="(min-width: 640px) 22rem, 72vw" tone={i + 1} placeholderLabel={null} />
              </div>
              {photo.caption ? (
                <figcaption className="mt-3 font-serif text-lg italic text-cocoa/80">{photo.caption}</figcaption>
              ) : null}
            </figure>
          ))}
        </PhotoStrip>
      </section>

      {/* Featured video */}
      <section className="bg-cocoa-deep px-5 py-24 text-ivory sm:px-8 sm:py-32" aria-labelledby="video-heading">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-12 text-center">
            <p className="eyebrow !text-ivory/60">Jojo in motion</p>
            <h2 id="video-heading" className="mt-4 text-4xl sm:text-5xl">
              {featuredVideo.title ?? "A little film of Jojo"}
            </h2>
          </Reveal>
          <Reveal>
            <FeaturedVideo
              video={featuredVideo}
              poster={<VideoPoster video={featuredVideo} sizes="(min-width: 1152px) 1152px, 100vw" />}
            />
          </Reveal>
          <div className="mt-10 text-center">
            <Link href="/videos" className="text-sm text-ivory/75 underline-offset-4 hover:text-ivory hover:underline">
              All videos →
            </Link>
          </div>
        </div>
      </section>

      {/* Timeline preview */}
      <section className="px-6 py-24 sm:py-32" aria-labelledby="timeline-heading">
        <SectionHeading eyebrow="His life, chapter by chapter" title={<span id="timeline-heading">The timeline</span>} />
        <ol className="relative mx-auto mt-16 max-w-3xl border-l border-taupe/50 pl-8 sm:pl-12">
          {timeline.slice(0, 4).map((event, i) => (
            <Reveal as="li" key={event.id} delay={i * 0.1} className="relative pb-12 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[2.37rem] top-2 h-3 w-3 rounded-full bg-sage ring-4 ring-ivory sm:-left-[3.37rem]"
              />
              <p className="eyebrow">{formatDate(event.eventDate, event.datePrecision)}</p>
              <h3 className="mt-2 text-3xl text-cocoa">{event.title}</h3>
              {event.story ? (
                <p className="mt-3 line-clamp-3 text-cocoa/75">{event.story}</p>
              ) : null}
            </Reveal>
          ))}
        </ol>
        {timeline.length <= 1 ? (
          <div className="mx-auto mt-10 max-w-3xl">
            <EditablePlaceholder>More milestones from Jojo’s life will appear here as they are added.</EditablePlaceholder>
          </div>
        ) : null}
        <div className="mt-14 text-center">
          <Link href="/timeline" className="btn btn-ghost">
            Walk through his years <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* The Little Things */}
      <section className="bg-sage/15 px-5 py-24 sm:px-8 sm:py-32" aria-labelledby="little-heading">
        <SectionHeading eyebrow="The little things" title={<span id="little-heading">The Little Things</span>}>
          {home.littleThingsIntro ? <p>{home.littleThingsIntro}</p> : null}
        </SectionHeading>
        <ul className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {littleThings.slice(0, 4).map((thing, i) => (
            <Reveal as="li" key={thing.id} delay={i * 0.08} className="rounded-3xl bg-ivory p-7 shadow-[0_1px_0_rgba(81,68,60,0.06)]">
              <span aria-hidden className="text-3xl">
                {thing.emoji ?? "🐾"}
              </span>
              <h3 className="mt-4 text-2xl text-cocoa">{thing.title}</h3>
              <p className={cn("mt-2 text-sm leading-relaxed", thing.body ? "text-cocoa/75" : "italic text-taupe-dark")}>
                {thing.body ? thing.body.slice(0, 140) : "✎ Waiting to be filled in"}
              </p>
            </Reveal>
          ))}
        </ul>
        <div className="mt-12 text-center">
          <Link href="/little-things" className="btn btn-ghost">
            All the little things <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Forever */}
      <section className="relative overflow-hidden px-6 py-32 text-center sm:py-48">
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[22rem] leading-none text-cream sm:text-[34rem]"
        >
          ∞
        </span>
        <Reveal className="relative">
          <h2 className="text-5xl text-cocoa sm:text-7xl">{home.finalHeading}</h2>
          {home.finalBody ? (
            <p className="mx-auto mt-6 max-w-xl font-serif text-xl italic text-cocoa/75 sm:text-2xl">
              {home.finalBody}
            </p>
          ) : null}
          <p className="mt-8 text-xs uppercase tracking-[0.3em] text-taupe-dark">11 March 2017 — ♾️</p>
          <div className="mt-12">
            <Link href="/letters" className="btn btn-primary">
              Write a letter to Jojo
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
