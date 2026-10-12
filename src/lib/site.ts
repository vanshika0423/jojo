export const site = {
  name: "Forever Jojo ♾️",
  shortName: "Forever Jojo",
  description:
    "A permanent digital home for Jojo, our Indian Spitz — his photographs, little adventures, funny moments and the love that surrounds him. 11 March 2017 — ♾️",
  born: "2017-03-11",
  bornLabel: "11 March 2017",
};

export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/story", label: "His Story" },
  { href: "/memories", label: "Memories" },
  { href: "/videos", label: "Videos" },
  { href: "/timeline", label: "Timeline" },
  { href: "/letters", label: "Letters" },
] as const;

export const footerNav = [
  ...mainNav.slice(1),
  { href: "/little-things", label: "Little Things" },
] as const;
