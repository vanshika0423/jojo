import Link from "next/link";

export default function NotFound() {
  return (
    <main className="bg-ivory flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p aria-hidden className="text-taupe font-serif text-8xl">
        ∞
      </p>
      <h1 className="text-cocoa mt-6 text-4xl sm:text-5xl">This page wandered off</h1>
      <p className="text-cocoa/70 mt-4 max-w-md">
        Like a curious pup following a scent. Let’s head back home.
      </p>
      <Link href="/" className="btn btn-primary mt-10">
        Back to Jojo
      </Link>
    </main>
  );
}
