import Link from "next/link";
import { footerNav, site } from "@/lib/site";
import { InfinityText } from "@/components/site/infinity-text";

export function SiteFooter() {
  return (
    <footer className="border-t border-taupe/25 bg-cream/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-16 text-center">
        <Link href="/" className="font-serif text-3xl text-cocoa">
          <InfinityText text={site.name} />
        </Link>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-cocoa/70">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-cocoa">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="font-serif text-lg italic text-cocoa/80"><InfinityText text="Made with endless love for Jojo ♾️" /></p>
        <p className="text-xs tracking-[0.2em] text-taupe-dark uppercase">{site.bornLabel} — <InfinityText text="♾️" /></p>
      </div>
    </footer>
  );
}
