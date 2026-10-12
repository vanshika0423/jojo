import { Fragment } from "react";

const INFINITY = /♾️|♾︎?/g;

/**
 * Renders text containing ♾️ with a typographic infinity sign instead of the
 * colour emoji, so it sits quietly in the warm palette. Screen readers still
 * hear "forever".
 */
export function InfinityText({ text }: { text: string }) {
  const parts = text.split(INFINITY);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 ? (
            <span role="img" aria-label="forever" className="inline-block font-serif font-normal not-italic">
              ∞
            </span>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}
