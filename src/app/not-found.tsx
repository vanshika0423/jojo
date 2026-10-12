import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-6 text-center">
      <p aria-hidden className="font-serif text-8xl text-taupe">∞</p>
      <h1 className="mt-6 text-4xl text-cocoa sm:text-5xl">This page wandered off</h1>
      <p className="mt-4 max-w-md text-cocoa/70">
        Like a curious pup following a scent. Let’s head back home.
      </p>
      <Link href="/" className="btn btn-primary mt-10">
        Back to Jojo
      </Link>
    </main>
  );
}
