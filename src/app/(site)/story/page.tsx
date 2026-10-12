import type { Metadata } from "next";
import Link from "next/link";
import { PhotoFrame } from "@/components/media/photo-frame";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";
import { RichText } from "@/components/site/rich-text";
import { PageHeader } from "@/components/site/section-heading";
import { getStorySections } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Jojo's Story",
  description: "The story of Jojo, our Indian Spitz — told by the family who loves him.",
  alternates: { canonical: "/story" },
};

export default async function StoryPage() {
  const sections = await getStorySections();

  return (
    <article>
      <PageHeader eyebrow="His Story" title="Jojo’s Story">
        <p>Born 11 March 2017 · Indian Spitz · Forever ours</p>
      </PageHeader>

      <nav aria-label="Chapters" className="mx-auto mb-10 max-w-3xl px-6">
        <ol className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-cocoa/65">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.slug}`} className="underline-offset-4 hover:text-cocoa hover:underline">
                <span className="mr-1 font-serif italic text-taupe-dark">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((section, i) => (
        <section key={section.id} id={section.slug} aria-labelledby={`${section.slug}-title`} className="scroll-mt-24">
          <Reveal className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
            <div className="relative aspect-[3/2] overflow-hidden rounded-[var(--radius-photo)] bg-cream sm:aspect-[21/9]">
              <Parallax className="absolute inset-0" strength={36}>
                <div className="relative h-full w-full">
                  <PhotoFrame
                    photo={section.photo}
                    sizes="(min-width: 1152px) 1152px, 100vw"
                    tone={i}
                    placeholderLabel={`A photograph for “${section.title}”`}
                  />
                </div>
              </Parallax>
            </div>
            {section.photo?.caption ? (
              <p className="mt-3 text-center font-serif text-base italic text-taupe-dark">{section.photo.caption}</p>
            ) : null}
          </Reveal>
          <div className="mx-auto max-w-2xl px-6 pb-20 pt-6 sm:pb-28">
            <Reveal>
              <p className="eyebrow">Chapter {String(i + 1).padStart(2, "0")}</p>
              <h2 id={`${section.slug}-title`} className="mt-3 text-4xl text-cocoa sm:text-5xl">
                {section.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="mt-8">
              <RichText text={section.body} placeholder={`Tell the story of “${section.title}” here.`} />
            </Reveal>
          </div>
        </section>
      ))}

      <div className="pb-28 text-center">
        <Link href="/timeline" className="btn btn-ghost">
          Continue to his timeline <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
