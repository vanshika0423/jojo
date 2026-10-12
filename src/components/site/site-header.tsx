"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { mainNav, site } from "@/lib/site";
import { cn } from "@/lib/cn";
import { InfinityText } from "@/components/site/infinity-text";

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}
const isScrolled = () => window.scrollY > 40;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeScroll, isScrolled, () => false);
  const onHome = pathname === "/";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const overHero = onHome && !scrolled && !open;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-500",
          overHero
            ? "text-ivory bg-transparent"
            : "bg-ivory/85 text-cocoa shadow-[0_1px_0_rgba(81,68,60,0.08)] backdrop-blur-md",
        )}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-8"
        >
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="font-serif text-2xl tracking-tight sm:text-[1.7rem]"
          >
            <InfinityText text={site.name} />
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {mainNav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative text-sm tracking-wide transition-opacity hover:opacity-100",
                      active ? "opacity-100" : "opacity-75",
                    )}
                  >
                    {item.label}
                    {active ? (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute right-0 -bottom-1.5 left-0 h-px bg-current"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-6" aria-hidden>
              <span
                className={cn(
                  "absolute left-0 h-px w-6 bg-current transition-transform duration-300",
                  open ? "top-1.5 rotate-45" : "top-0",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 h-px w-6 bg-current transition-transform duration-300",
                  open ? "top-1.5 -rotate-45" : "top-3",
                )}
              />
            </span>
          </button>
        </nav>
      </header>

      {/* Rendered outside <header>: its backdrop-filter would otherwise become
          the containing block for this fixed panel and collapse it. */}
      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-ivory fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-6 pt-8">
              {[...mainNav, { href: "/little-things", label: "Little Things" }].map((item, i) => (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className="text-cocoa block py-3 font-serif text-4xl"
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <p className="text-taupe-dark px-6 pt-8 pb-10 text-sm">
              11 March 2017 — <InfinityText text="♾️" />
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
