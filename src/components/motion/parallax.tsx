"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/** Subtle vertical drift while the element crosses the viewport. */
export function Parallax({
  children,
  className,
  strength = 40,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-strength, strength]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { y, scale: 1 + strength / 300 }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}
