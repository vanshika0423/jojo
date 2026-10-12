import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  children,
  align = "center",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Reveal
      as="header"
      className={cn(
        "mx-auto max-w-2xl",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
      <Tag
        className={cn(
          "text-cocoa",
          Tag === "h1" ? "text-5xl leading-[1.05] sm:text-6xl md:text-7xl" : "text-4xl leading-tight sm:text-5xl",
        )}
      >
        {title}
      </Tag>
      {children ? <div className="mt-5 text-base leading-relaxed text-cocoa/75 sm:text-lg">{children}</div> : null}
    </Reveal>
  );
}

export function PageHeader(props: Omit<Parameters<typeof SectionHeading>[0], "as">) {
  return (
    <div className="px-5 pb-10 pt-32 sm:pt-40">
      <SectionHeading {...props} as="h1" />
    </div>
  );
}
