"use client";

import { useSyncExternalStore } from "react";

const queries = [
  { media: "(min-width: 1280px)", columns: 4 },
  { media: "(min-width: 768px)", columns: 3 },
];

function subscribe(callback: () => void) {
  const lists = queries.map((q) => window.matchMedia(q.media));
  lists.forEach((l) => l.addEventListener("change", callback));
  return () => lists.forEach((l) => l.removeEventListener("change", callback));
}

function getColumns() {
  return queries.find((q) => window.matchMedia(q.media).matches)?.columns ?? 2;
}

/** Number of masonry columns for the current viewport (2 on phones). */
export function useColumns() {
  return useSyncExternalStore(subscribe, getColumns, () => 2);
}

/** Place items into the currently shortest column, keeping reading order stable. */
export function distribute<T extends { width: number; height: number }>(items: T[], columns: number) {
  const cols: Array<Array<{ item: T; index: number }>> = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  items.forEach((item, index) => {
    const shortest = heights.indexOf(Math.min(...heights));
    cols[shortest].push({ item, index });
    heights[shortest] += item.height / item.width;
  });
  return cols;
}
