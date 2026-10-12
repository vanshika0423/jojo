"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { Lightbox } from "@/components/gallery/lightbox";
import { PhotoFrame } from "@/components/media/photo-frame";
import { Reveal } from "@/components/motion/reveal";
import { EditablePlaceholder } from "@/components/site/rich-text";
import { PlayIcon } from "@/components/video/play-icon";
import { VideoModal } from "@/components/video/video-modal";
import { VideoPoster } from "@/components/video/video-poster";
import { formatDate, paragraphs, yearOf } from "@/lib/format";
import type { Photo, TimelineEvent, Video } from "@/lib/types";
import { InfinityText } from "@/components/site/infinity-text";

export function TimelineView({
  events,
  allowDownloads,
}: {
  events: TimelineEvent[];
  allowDownloads: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number } | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const closeVideo = useCallback(() => setVideo(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const setIndex = useCallback((index: number) => setLightbox((lb) => (lb ? { ...lb, index } : lb)), []);

  const years = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    for (const e of events) {
      const y = yearOf(e.eventDate);
      map.set(y, [...(map.get(y) ?? []), e]);
    }
    return [...map.entries()];
  }, [events]);

  return (
    <>
      <nav
        aria-label="Years"
        className="border-taupe/20 bg-ivory/90 sticky top-16 z-30 mb-12 border-y backdrop-blur-md sm:top-20"
      >
        <ul className="no-scrollbar mx-auto flex w-fit max-w-full gap-1 overflow-x-auto px-5 py-3">
          {years.map(([year]) => (
            <li key={year}>
              <a
                href={`#year-${year}`}
                className="text-cocoa/75 hover:bg-cream hover:text-cocoa block rounded-full px-4 py-1.5 font-serif text-lg transition-colors"
              >
                {year}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div ref={ref} className="relative mx-auto max-w-4xl px-5 pb-28 sm:px-8">
        <div aria-hidden className="bg-taupe/30 absolute top-0 bottom-0 left-[1.6rem] w-px sm:left-1/2" />
        <motion.div
          aria-hidden
          className="bg-cocoa/60 absolute top-0 bottom-0 left-[1.6rem] w-px origin-top sm:left-1/2"
          style={reduce ? undefined : { scaleY: progress }}
        />

        {years.map(([year, yearEvents]) => (
          <section
            key={year}
            id={`year-${year}`}
            aria-labelledby={`year-${year}-h`}
            className="relative scroll-mt-40"
          >
            <h2
              id={`year-${year}-h`}
              className="bg-ivory text-cocoa relative z-10 mx-auto mb-12 w-fit rounded-full px-5 font-serif text-5xl sm:text-6xl"
            >
              {year}
            </h2>
            <ol className="space-y-16 pb-16">
              {yearEvents.map((event, i) => {
                const photos = event.media.flatMap((m) => (m.kind === "photo" ? [m.photo] : []));
                const videos = event.media.flatMap((m) => (m.kind === "video" ? [m.video] : []));
                const right = i % 2 === 1;
                return (
                  <li key={event.id} className="relative pl-12 sm:grid sm:grid-cols-2 sm:gap-16 sm:pl-0">
                    <span
                      aria-hidden
                      className="bg-sage ring-ivory absolute top-2 left-[1.25rem] h-3 w-3 -translate-x-[0.03rem] rounded-full ring-[6px] sm:left-1/2 sm:-translate-x-1/2"
                    />
                    <Reveal className={right ? "sm:col-start-2" : "sm:text-right"}>
                      <p className="eyebrow">{formatDate(event.eventDate, event.datePrecision)}</p>
                      <h3 className="text-cocoa mt-2 text-3xl sm:text-4xl">{event.title}</h3>
                      <div className="text-cocoa/80 mt-4 space-y-3 leading-relaxed">
                        {event.story ? (
                          paragraphs(event.story).map((p, j) => <p key={j}>{p}</p>)
                        ) : (
                          <EditablePlaceholder className="text-left">
                            The story of this moment is waiting to be written.
                          </EditablePlaceholder>
                        )}
                      </div>
                      {photos.length || videos.length ? (
                        <ul className="mt-6 grid grid-cols-3 gap-2">
                          {photos.map((photo, j) => (
                            <li
                              key={photo.id}
                              className={j === 0 && photos.length !== 3 ? "col-span-2 row-span-2" : ""}
                            >
                              <button
                                type="button"
                                onClick={() => setLightbox({ photos, index: j })}
                                className="photo-zoom bg-cream relative block aspect-square w-full overflow-hidden rounded-xl"
                                aria-label={photo.caption ? `Open photo: ${photo.caption}` : "Open photo"}
                              >
                                <PhotoFrame
                                  photo={photo}
                                  sizes="(min-width: 640px) 220px, 33vw"
                                  placeholderLabel={null}
                                />
                              </button>
                            </li>
                          ))}
                          {videos.map((v) => (
                            <li key={v.id} className="col-span-3">
                              <button
                                type="button"
                                onClick={() => setVideo(v)}
                                className="photo-zoom group bg-cream relative block aspect-video w-full overflow-hidden rounded-xl"
                                aria-label={`Play ${v.title ?? "video"}`}
                              >
                                <VideoPoster video={v} sizes="(min-width: 640px) 420px, 100vw" />
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <PlayIcon className="h-12 w-12" />
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        <div className="bg-ivory relative z-10 mx-auto w-fit rounded-full px-6 text-center">
          <p className="text-cocoa font-serif text-6xl">
            <InfinityText text="♾️" />
          </p>
          <p className="eyebrow mt-2">And on, forever</p>
        </div>
      </div>

      <Lightbox
        photos={lightbox?.photos ?? []}
        index={lightbox?.index ?? null}
        onIndexChange={setIndex}
        onClose={closeLightbox}
        allowDownloads={allowDownloads}
      />
      <VideoModal video={video} onClose={closeVideo} />
    </>
  );
}
