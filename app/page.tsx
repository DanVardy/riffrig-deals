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
      <section className="hero" aria-labelledby="home-title">
        <h1 id="home-title">Build your guitar setup for free.</h1>
        <p className="lede prose">Start with a free recorder or DAW, then add an amp, a cabinet, and effects. Come back for the next useful free tool. Paid deals stay available when you want them.</p>
        <div className="actions">
          <Link className="button primary" href="/free">Browse free software</Link>
          <Link className="button" href="/deals">See verified deals</Link>
        </div>
        <form className="search" action="/catalogue" method="get" role="search">
          <label htmlFor="home-search">Search the full catalogue</label>
          <input id="home-search" className="text-input" name="q" placeholder="Name, developer, or description" />
        </form>
      </section>
      <nav className="stage-links" aria-label="Free setup steps">
        <Link href="/free?stage=host">Record and host</Link>
        <Link href="/free?stage=amp">Amps</Link>
        <Link href="/free?stage=cabinet">Cabinets and IRs</Link>
        <Link href="/free?stage=effects">Effects</Link>
        <Link href="/free?stage=capture">Capture and models</Link>
      </nav>
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
