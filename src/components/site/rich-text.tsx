import { cn } from "@/lib/cn";
import { paragraphs } from "@/lib/format";

/** Shown wherever the family hasn't written their words yet. */
export function EditablePlaceholder({
  children = "This part of Jojo's story is waiting to be written.",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-2xl border border-dashed border-taupe/70 bg-cream/40 px-5 py-4 font-serif text-lg italic text-taupe-dark",
        className,
      )}
    >
      <span aria-hidden className="mr-2 not-italic">✎</span>
      {children}
      <span className="mt-1 block font-sans text-xs not-italic tracking-wide text-taupe-dark/80">
        Editable placeholder · add these words from the admin dashboard
      </span>
    </p>
  );
}

export function RichText({
  text,
  className,
  placeholder,
}: {
  text: string | null | undefined;
  className?: string;
  placeholder?: string;
}) {
  const paras = paragraphs(text);
  if (paras.length === 0) return <EditablePlaceholder>{placeholder}</EditablePlaceholder>;
  return (
    <div className={cn("prose-jojo", className)}>
      {paras.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}
