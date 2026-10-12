import Link from "next/link";
import { footerNav, site } from "@/lib/site";
import { InfinityText } from "@/components/site/infinity-text";

export function SiteFooter() {
  return (
    <footer className="border-taupe/25 bg-cream/60 border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-16 text-center">
        <Link href="/" className="text-cocoa font-serif text-3xl">
          <InfinityText text={site.name} />
        </Link>
        <nav aria-label="Footer">
          <ul className="text-cocoa/70 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-cocoa transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-cocoa/80 font-serif text-lg italic">
          <InfinityText text="Made with endless love for Jojo ♾️" />
        </p>
        <p className="text-taupe-dark text-xs tracking-[0.2em] uppercase">
          {site.bornLabel} — <InfinityText text="♾️" />
        </p>
      </div>
    </footer>
  );
}
