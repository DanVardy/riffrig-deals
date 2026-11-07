import type { Metadata } from "next";
import Link from "next/link";
import { verifiedDeals } from "@/lib/filter";
import { expiryLabel, publicPrice } from "@/lib/price";
import { getRuntime } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Verified sales",
  description: "Current guitar-plugin sales that were checked on the vendor's own page. Empty when none are verified.",
};

export default async function DealsPage() {
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return null;
  const deals = verifiedDeals(await runtime.store.listEntries());
  return (
    <main id="content" className="wrap">
      <p className="kicker">Verified sales</p>
      <h1>Current deals</h1>
      {deals.length === 0 ? (
        <section className="empty">
          <p>No verified sales right now.</p>
          <p>A listing needs a sale price confirmed on the vendor’s own page. If that page has no end date, the sale can still be listed and is labelled “expiry unknown”. Machine-read prices, historic lows, and guessed discounts are not published.</p>
          <p><Link href="/catalogue">Browse the catalogue anyway</Link></p>
        </section>
      ) : (
        <ul className="deal-list">
          {deals.map((entry) => (
            <li key={entry.slug}>
              <Link href={`/plugins/${entry.slug}`}>{entry.name} — {publicPrice(entry).label}. {expiryLabel(entry)}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
