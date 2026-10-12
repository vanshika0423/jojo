import type { Metadata } from "next";
import { PhotoFrame } from "@/components/media/photo-frame";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/section-heading";
import { getLittleThings, getSettings } from "@/lib/data/public";
import { paragraphs } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Little Things About Jojo",
  description: "Jojo's favourite food, toys, walks, sleeping spots and funny habits.",
  alternates: { canonical: "/little-things" },
};

const cardTones = ["bg-cream", "bg-sage/20", "bg-[#f3ece3]", "bg-taupe/20"];

export default async function LittleThingsPage() {
  const [things, settings] = await Promise.all([getLittleThings(), getSettings()]);

  return (
    <>
      <PageHeader eyebrow="Little things" title="Little Things About Jojo">
        {settings.home.littleThingsIntro ? <p>{settings.home.littleThingsIntro}</p> : null}
      </PageHeader>
      <ul className="mx-auto grid max-w-6xl gap-5 px-5 pb-28 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {things.map((thing, i) => (
          <Reveal
            as="li"
            key={thing.id}
            delay={(i % 3) * 0.08}
            className={cn(
              "group flex flex-col overflow-hidden rounded-[1.75rem] transition-transform duration-500 hover:-translate-y-1 motion-reduce:hover:translate-y-0",
              cardTones[i % cardTones.length],
              i === 0 && "lg:col-span-2",
            )}
          >
            {thing.photo ? (
              <div className="photo-zoom relative aspect-[16/10] overflow-hidden">
                <PhotoFrame
                  photo={thing.photo}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
            ) : null}
            <div className="flex flex-1 flex-col p-7 sm:p-8">
              <span
                aria-hidden
                className="inline-block text-4xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transform-none"
              >
                {thing.emoji ?? "🐾"}
              </span>
              <h2 className="text-cocoa mt-5 text-3xl">{thing.title}</h2>
              {thing.body ? (
                <div className="text-cocoa/80 mt-3 space-y-3 leading-relaxed">
                  {paragraphs(thing.body).map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              ) : (
                <p className="text-taupe-dark mt-3 font-serif text-lg italic">
                  ✎ Waiting to be filled in from the admin dashboard
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </ul>
    </>
  );
}
