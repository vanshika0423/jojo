import type { Metadata } from "next";
import { LetterForm } from "@/components/letters/letter-form";
import { PhotoFrame } from "@/components/media/photo-frame";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/section-heading";
import { getPublicLetters, getSettings } from "@/lib/data/public";
import { formatDate, paragraphs } from "@/lib/format";
import { InfinityText } from "@/components/site/infinity-text";

export const metadata: Metadata = {
  title: "Letters to Jojo",
  description: "A quiet place for the family's letters to Jojo.",
  alternates: { canonical: "/letters" },
};

export default async function LettersPage() {
  const [letters, settings] = await Promise.all([getPublicLetters(), getSettings()]);

  return (
    <>
      <PageHeader eyebrow="Letters" title="Letters to Jojo">
        <p>Words we still want him to hear.</p>
      </PageHeader>

      <div className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        {letters.length === 0 ? (
          <p className="text-taupe-dark py-10 text-center font-serif text-2xl italic">
            The first letter is waiting to be written.
          </p>
        ) : (
          <ol className="space-y-12">
            {letters.map((letter, i) => (
              <Reveal as="li" key={letter.id} delay={Math.min(i, 3) * 0.06}>
                <article className="paper relative overflow-hidden rounded-[1.5rem] px-7 pt-9 pb-10 shadow-[0_20px_50px_-30px_rgba(58,48,42,0.45)] sm:px-12">
                  <header className="mb-6 flex items-baseline justify-between gap-4">
                    <p className="eyebrow">{formatDate(letter.letterDate)}</p>
                    <span aria-hidden className="text-taupe font-serif text-2xl">
                      <InfinityText text="♾️" />
                    </span>
                  </header>
                  {letter.photo ? (
                    <div className="bg-cream relative mb-8 aspect-[4/3] overflow-hidden rounded-xl">
                      <PhotoFrame photo={letter.photo} sizes="(min-width: 768px) 640px, 100vw" />
                    </div>
                  ) : null}
                  <div className="text-cocoa space-y-[2rem] font-serif text-xl leading-8">
                    {paragraphs(letter.body).map((p, j) => (
                      <p key={j} className="whitespace-pre-line">
                        {p}
                      </p>
                    ))}
                  </div>
                  <footer className="text-cocoa/80 mt-8 text-right font-serif text-xl italic">
                    — {letter.authorName}
                  </footer>
                </article>
              </Reveal>
            ))}
          </ol>
        )}
      </div>

      {settings.features.lettersOpen ? (
        <section aria-labelledby="write-heading" className="bg-cream/50 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-2xl">
            <h2 id="write-heading" className="text-cocoa mb-8 text-center text-4xl sm:text-5xl">
              Write to Jojo
            </h2>
            <LetterForm />
          </div>
        </section>
      ) : null}
    </>
  );
}
