import { cn } from "@/lib/cn";

/**
 * A warm, quiet frame shown until a real photograph is uploaded.
 * Deliberately abstract: it never pretends to be Jojo.
 */
export function PhotoPlaceholder({
  className,
  label = "A photograph of Jojo will live here",
  tone = 0,
  compact = false,
}: {
  className?: string;
  label?: string | null;
  tone?: number;
  compact?: boolean;
}) {
  const tones = [
    "from-cream via-[#e8dfd2] to-taupe/60",
    "from-[#eef0ea] via-cream to-sage/50",
    "from-ivory via-cream to-[#d9cbbd]",
    "from-[#f1e9de] via-[#e6dccf] to-taupe/40",
  ];
  return (
    <div
      role="img"
      aria-label={label ?? "Photo placeholder"}
      className={cn(
        "photo-zoom-target relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br",
        tones[Math.abs(tone) % tones.length],
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div className="text-cocoa/45 relative flex flex-col items-center gap-2 px-4 text-center">
        <span aria-hidden className={cn("font-serif leading-none", compact ? "text-3xl" : "text-5xl")}>
          ∞
        </span>
        {label && !compact ? (
          <span className="max-w-[16rem] text-[0.7rem] tracking-[0.2em] uppercase">{label}</span>
        ) : null}
      </div>
    </div>
  );
}
