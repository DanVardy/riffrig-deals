"use client";

export default function LoadError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="content" className="wrap">
      <h1>Couldn&apos;t load plugins</h1>
      <p className="lede">The catalogue did not load. Your search is still in the address bar if you had one.</p>
      <button type="button" className="button primary" onClick={() => reset()}>Retry</button>
    </main>
  );
}
