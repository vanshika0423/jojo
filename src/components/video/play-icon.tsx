export function PlayIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={
        "bg-ivory/90 text-cocoa flex h-16 w-16 items-center justify-center rounded-full shadow-lg backdrop-blur transition-transform duration-500 group-hover:scale-105 " +
        (className ?? "")
      }
    >
      <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor">
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
      </svg>
    </span>
  );
}
