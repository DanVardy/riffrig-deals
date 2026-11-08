import type { Metadata } from "next";
import Link from "next/link";
import { PluginCard } from "@/components/plugin-card";
import { verifiedDeals } from "@/lib/filter";
import { getRuntime } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Verified deals",
  description: "Guitar plugin sales checked on the seller’s own page. Empty when none are verified.",
};

export default async function DealsPage() {
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return null;
  const deals = verifiedDeals(await runtime.store.listEntries());
  return (
    <main id="content" className="wrap">
      <h1>Verified deals</h1>
      <p className="lede prose">Only sales confirmed on the seller’s page. A sale with no published end date is labelled “expiry unknown”.</p>
      {deals.length === 0 ? (
        <div className="empty">
          <p>No verified deals right now.</p>
          <Link className="button" href="/catalogue">Browse all plugins</Link>
        </div>
      ) : (
        <div className="deal-grid">
          {deals.map((entry) => (
            <PluginCard key={entry.slug} entry={entry} returnTo="/deals" />
          ))}
        </div>
      )}
    </main>
  );
}
