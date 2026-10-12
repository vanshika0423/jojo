"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { HeroSettings } from "@/lib/settings";
import { InfinityText } from "@/components/site/infinity-text";

/**
 * Full-screen opening. The photograph is rendered on the server and passed in
 * as `media`; this component only adds the gentle parallax and fade.
 */
export function Hero({ hero, media }: { hero: HeroSettings; media: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section
      ref={ref}
      aria-label="Jojo"
      className="relative flex h-[100svh] min-h-[560px] items-end overflow-hidden bg-cocoa-deep text-ivory"
    >
      <motion.div
        className="absolute inset-0"
        style={reduce ? undefined : { y, scale: 1.08 }}
        initial={reduce ? false : { opacity: 0, scale: 1.14 }}
        animate={{ opacity: 1, scale: 1.08 }}
        transition={{ duration: 2.2, ease }}
      >
        {media}
      </motion.div>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-cocoa-deep/85 via-cocoa-deep/25 to-cocoa-deep/35"
      />

      <motion.div
        style={reduce ? undefined : { opacity: fade }}
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 sm:px-10 sm:pb-28"
      >
        <motion.h1
          className="font-serif text-[4.5rem] leading-none tracking-tight sm:text-[7rem] md:text-[9rem]"
          initial={reduce ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, delay: 0.4, ease }}
        >
          <InfinityText text={hero.title} />
        </motion.h1>
        <motion.p
          className="mt-4 text-sm uppercase tracking-[0.3em] text-ivory/85 sm:text-base"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.75, ease }}
        >
          <InfinityText text={hero.dates} />
        </motion.p>
        {hero.tagline ? (
          <motion.p
            className="mt-6 max-w-xl font-serif text-2xl italic leading-snug text-ivory/90 sm:text-3xl"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 1, ease }}
          >
            {hero.tagline}
          </motion.p>
        ) : null}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.3 }}
          className="mt-10"
        >
          <a
            href="#his-world"
            className="inline-flex items-center gap-3 rounded-full border border-ivory/50 bg-ivory/10 px-6 py-3 text-sm tracking-wide backdrop-blur-sm transition-colors hover:bg-ivory hover:text-cocoa"
          >
            {hero.cta}
            <span aria-hidden>→</span>
          </a>
        </motion.div>
      </motion.div>

      <a
        href="#his-world"
        aria-label="Scroll to explore"
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-ivory/70 sm:flex"
      >
        Scroll
        <span className="relative block h-10 w-px overflow-hidden bg-ivory/25">
          <motion.span
            className="absolute left-0 top-0 block h-4 w-px bg-ivory"
            animate={reduce ? undefined : { y: [-16, 40] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </a>
    </section>
  );
}
