"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { PhotoFrame } from "@/components/media/photo-frame";
import { Lightbox } from "@/components/gallery/lightbox";
import { distribute, useColumns } from "@/components/gallery/use-columns";
import { GALLERY_PAGE_SIZE } from "@/lib/gallery";
import { cn } from "@/lib/cn";
import type { Album, Photo } from "@/lib/types";

type PageState = { photos: Photo[]; hasMore: boolean; total: number | null; error?: boolean };

type GalleryProps = {
  albums: Album[];
  initial: PageState;
  allowDownloads: boolean;
  /** True when there are no real photos yet: show placeholders, don't fetch. */
  placeholderMode: boolean;
};

const FAVOURITES = "our-favourites";

async function requestPage(album: string | null, q: string, offset: number): Promise<PageState> {
  try {
    const params = new URLSearchParams({ offset: String(offset) });
    if (album === FAVOURITES) params.set("favourites", "1");
    else if (album) params.set("album", album);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/photos?${params}`);
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as PageState;
  } catch {
    return { photos: [], hasMore: false, total: null, error: true };
  }
}

function keyOf(album: string | null, q: string) {
  return `${album ?? "all"}|${q.trim().toLowerCase()}`;
}

export function Gallery({ albums, initial, allowDownloads, placeholderMode }: GalleryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const album = searchParams.get("album");
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(urlQuery);
  const [pages, setPages] = useState<Record<string, PageState>>(() => ({ [keyOf(null, "")]: initial }));
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const columns = useColumns();
  const sentinel = useRef<HTMLDivElement>(null);

  const key = keyOf(album, urlQuery);
  const current = placeholderMode ? initial : pages[key];
  const photos = current?.photos ?? [];
  const loading = (!current && !placeholderMode) || loadingMore;

  const updateUrl = (next: { album?: string | null; q?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.album !== undefined) {
      if (next.album) params.set("album", next.album);
      else params.delete("album");
    }
    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // First page for a new album or search.
  useEffect(() => {
    if (current || placeholderMode) return;
    let cancelled = false;
    void requestPage(album, urlQuery, 0).then((page) => {
      if (!cancelled) setPages((prev) => ({ ...prev, [key]: page }));
    });
    return () => {
      cancelled = true;
    };
  }, [current, key, album, urlQuery, placeholderMode]);

  const loadMore = () => {
    if (!current?.hasMore || loadingMore || placeholderMode) return;
    setLoadingMore(true);
    const pageKey = key;
    void requestPage(album, urlQuery, current.photos.length)
      .then((page) =>
        setPages((prev) => {
          const existing = prev[pageKey]?.photos ?? [];
          const seen = new Set(existing.map((p) => p.id));
          return {
            ...prev,
            [pageKey]: {
              photos: [...existing, ...page.photos.filter((p) => !seen.has(p.id))],
              hasMore: page.hasMore,
              total: prev[pageKey]?.total ?? page.total,
              error: page.error,
            },
          };
        }),
      )
      .finally(() => setLoadingMore(false));
  };

  // Infinite scroll: the observer always calls the latest loadMore.
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && loadMoreRef.current(),
      { rootMargin: "1200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const onNearEnd = useCallback(() => loadMoreRef.current(), []);

  // Debounced search → URL.
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onSearch = (value: string) => {
    setQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => updateUrl({ q: value }), 350);
  };

  const chips = [
    { slug: null, name: "All Memories" },
    { slug: FAVOURITES, name: "Our Favourites" },
    ...albums.map((a) => ({ slug: a.slug, name: a.name })),
  ];

  const cols = distribute(photos, columns);

  return (
    <div>
      <div className="bg-ivory/90 sticky top-16 z-30 -mx-5 mb-8 px-5 py-4 backdrop-blur-md sm:top-20 sm:mx-0 sm:rounded-full sm:px-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Albums" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {chips.map((chip) => {
              const active = (album ?? null) === chip.slug;
              return (
                <button
                  key={chip.slug ?? "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateUrl({ album: chip.slug })}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
                    active ? "bg-cocoa text-ivory" : "bg-cream/80 text-cocoa/80 hover:bg-cream",
                  )}
                >
                  {chip.name}
                </button>
              );
            })}
          </nav>
          <label className="relative block lg:w-72">
            <span className="sr-only">Search photos by caption or tag</span>
            <input
              type="search"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search captions or tags…"
              className="border-taupe/50 placeholder:text-taupe-dark/80 focus:border-sage-dark w-full rounded-full border bg-white/80 px-5 py-2.5 text-sm focus:outline-none"
              disabled={placeholderMode}
            />
          </label>
        </div>
      </div>

      {placeholderMode ? (
        <p className="text-taupe-dark mb-8 text-center font-serif text-lg italic">
          Jojo’s photographs will appear here as soon as they are uploaded and published.
        </p>
      ) : null}

      {current?.error ? (
        <p role="alert" className="text-taupe-dark mb-8 text-center text-sm">
          Some photos couldn’t load. Please check your connection and try again.
        </p>
      ) : null}

      {current && photos.length === 0 && !loading && !placeholderMode ? (
        <p className="text-taupe-dark py-24 text-center font-serif text-2xl italic">
          {urlQuery ? "No memories match that search yet." : "No photographs in this album yet."}
        </p>
      ) : null}

      <div
        className="flex gap-3 sm:gap-5"
        aria-busy={loading}
        aria-label={current?.total != null ? `${current.total} photographs` : undefined}
      >
        {cols.map((col, c) => (
          <ul key={c} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-5">
            {col.map(({ item: photo, index }) => (
              <motion.li
                key={photo.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -5% 0px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="photo-zoom group bg-cream relative block w-full overflow-hidden rounded-[var(--radius-photo)] text-left"
                  style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                  aria-label={photo.caption ? `Open photo: ${photo.caption}` : "Open photo"}
                >
                  <PhotoFrame
                    photo={photo}
                    sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
                    placeholderLabel={null}
                    tone={index}
                  />
                  {photo.isFavourite ? (
                    <span
                      aria-label="Favourite"
                      className="bg-ivory/85 text-cocoa absolute top-3 right-3 rounded-full px-2 py-0.5 text-xs backdrop-blur"
                    >
                      ♥
                    </span>
                  ) : null}
                  {photo.caption ? (
                    <span className="from-cocoa-deep/70 text-ivory pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent px-4 pt-10 pb-3 font-serif text-base italic opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
                      {photo.caption}
                    </span>
                  ) : null}
                </button>
              </motion.li>
            ))}
          </ul>
        ))}
      </div>

      <div ref={sentinel} aria-hidden className="h-px" />
      {loading ? (
        <p className="text-taupe-dark py-10 text-center text-sm tracking-[0.2em] uppercase" role="status">
          Gathering more memories…
        </p>
      ) : null}
      {current?.hasMore && !loading ? (
        <div className="py-10 text-center">
          <button type="button" className="btn btn-ghost" onClick={loadMore}>
            Show more
          </button>
        </div>
      ) : null}

      <Lightbox
        photos={photos}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
        allowDownloads={allowDownloads}
        onNearEnd={onNearEnd}
      />
    </div>
  );
}

export function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: Math.min(GALLERY_PAGE_SIZE, 12) }, (_, i) => (
        <div
          key={i}
          className="bg-cream animate-pulse rounded-[var(--radius-photo)]"
          style={{ aspectRatio: i % 3 === 0 ? "4 / 5" : i % 3 === 1 ? "1 / 1" : "3 / 2" }}
        />
      ))}
    </div>
  );
}
