import Link from "next/link";
import { CatalogueBrowser } from "@/components/catalogue-browser";
import { SignupForm } from "@/components/forms";
import { verifiedDeals } from "@/lib/filter";
import { expiryLabel, publicPrice } from "@/lib/price";
import { getRuntime } from "@/lib/runtime";
import { RESULT_COPY } from "@/lib/site";
import { one, readQuery, type SearchParams } from "@/lib/page-query";

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return null;
  const entries = await runtime.store.listEntries();
  const deals = verifiedDeals(entries);
  const query = await readQuery(searchParams);
  const result = one(query.result);
  return (
    <main id="content" className="wrap">
      {RESULT_COPY[result] ? <p className={`notice ${result === "not_saved" || result === "invalid" ? "error" : "ok"}`}>{RESULT_COPY[result]}</p> : null}
      <p className="kicker">Guitar plugins, all genres</p>
      <h1>RiffRig Deals</h1>
      <p className="lede">A repeat-visit tracker for amp sims, effects, cabinet IRs, and recording tools. Metal is a filter.</p>
      <section className="deal-strip" aria-label="Verified sales">
        <p className="kicker">Verified sales</p>
        {deals.length === 0 ? (
          <p>None confirmed. A checked vendor-page sale with no end date is labelled “expiry unknown”.</p>
        ) : (
          <ul className="deal-list">
            {deals.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/plugins/${entry.slug}`}>
                  {entry.name}: {publicPrice(entry).label}. {expiryLabel(entry)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <CatalogueBrowser entries={entries} initialQuery={one(query.q)} initialCategory={one(query.category)} initialGenre={one(query.genre)} />
      <section className="panel" aria-label="Friday letter">
        <h2>Friday letter</h2>
        <p className="note">Five picks, once a week, when sending is actually switched on. This form only stores consent.</p>
        <SignupForm source="home" />
      </section>
    </main>
  );
}
