import Link from "next/link";
import { PluginCard } from "@/components/plugin-card";
import { sortEntries, verifiedDeals } from "@/lib/filter";
import { getRuntime } from "@/lib/runtime";
import { RESULT_COPY } from "@/lib/site";
import { one, readQuery, type SearchParams } from "@/lib/page-query";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return null;
  const entries = sortEntries(await runtime.store.listEntries(), "name");
  const deals = verifiedDeals(entries);
  const query = await readQuery(searchParams);
  const result = one(query.result);
  return (
    <main id="content" className="wrap">
      {RESULT_COPY[result] ? <p className={`notice ${result === "not_saved" || result === "invalid" ? "error" : "ok"}`}>{RESULT_COPY[result]}</p> : null}
      <div className="home-intro">
        <h1>Find guitar plugins. Check the deal before you buy.</h1>
        <p className="lede prose">Search the catalogue, then read the seller’s own price before you decide. Metal is a filter, not the whole list.</p>
        <form className="search" action="/catalogue" method="get" role="search">
          <label htmlFor="home-search">Search plugins</label>
          <input id="home-search" className="text-input" name="q" placeholder="Name, developer, or description" />
        </form>
        <div className="actions">
          <Link className="button primary" href="/deals">Browse verified deals</Link>
          <Link href="/catalogue">Browse all plugins</Link>
        </div>
      </div>
      <section className="section" aria-label="Verified deals">
        <h2>Verified deals</h2>
        {deals.length === 0 ? (
          <div className="empty">
            <p>No verified deals right now.</p>
            <p className="note">A checked sale with no published end date is labelled “expiry unknown”. Unverified catalogue entries are not listed here.</p>
            <Link href="/catalogue">Browse all plugins</Link>
          </div>
        ) : (
          <div className="deal-grid">
            {deals.map((entry) => (
              <PluginCard key={entry.slug} entry={entry} returnTo="/" />
            ))}
          </div>
        )}
      </section>
      <section className="section">
        <h2>All plugins</h2>
        <p className="lede prose">Some catalogue entries have no verified current offer. Open the full list to search and filter.</p>
        <div className="cards">
          {entries.slice(0, 6).map((entry) => (
            <PluginCard key={entry.slug} entry={entry} returnTo="/" />
          ))}
        </div>
        <div className="actions">
          <Link className="button" href="/catalogue">Browse all plugins</Link>
        </div>
      </section>
      <section className="section prose">
        <h2>How prices are checked</h2>
        <p>A price is shown only after it is read on the seller’s own page, in that page’s currency. There is no automatic conversion. A verified sale with no published end date is labelled “expiry unknown”. If a catalogue entry has no checked price, it says the current price is not verified.</p>
      </section>
    </main>
  );
}
