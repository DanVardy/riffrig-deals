import type { Metadata } from "next";
import { CatalogueBrowser } from "@/components/catalogue-browser";
import { getRuntime } from "@/lib/runtime";
import { one, readQuery, type SearchParams } from "@/lib/page-query";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Search amp sims, effects, cabinet impulse responses, and guitar recording tools. Unverified prices are not shown.",
};

export default async function CataloguePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return null;
  const entries = await runtime.store.listEntries();
  const query = await readQuery(searchParams);
  return (
    <main id="content" className="wrap">
      <p className="kicker">Catalogue</p>
      <h1>Find a plugin</h1>
      <p className="lede">Individual products only. Vendor shop windows are not listed as if they were one plugin.</p>
      <CatalogueBrowser entries={entries} initialQuery={one(query.q)} initialCategory={one(query.category)} initialGenre={one(query.genre)} />
    </main>
  );
}
