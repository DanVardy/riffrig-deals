import type { Metadata } from "next";
import { CatalogueBrowser } from "@/components/catalogue-browser";
import { parseDeal, parseSort } from "@/lib/catalogue-query";
import { getRuntime } from "@/lib/runtime";
import { one, readQuery, type SearchParams } from "@/lib/page-query";

export const metadata: Metadata = {
  title: "All plugins",
  description: "Search amp sims, effects, cabinet impulse responses, and guitar recording tools. Unverified prices are not shown as deals.",
};

export default async function CataloguePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return null;
  const entries = await runtime.store.listEntries();
  const query = await readQuery(searchParams);
  return (
    <main id="content" className="wrap">
      <h1>All plugins</h1>
      <p className="lede prose">Individual products only. Shop windows are not listed as if they were one plugin. Prices stay blank until they are checked.</p>
      <CatalogueBrowser
        entries={entries}
        initial={{
          q: one(query.q),
          category: one(query.category),
          genre: one(query.genre),
          vendor: one(query.vendor),
          deal: parseDeal(one(query.deal)),
          sort: parseSort(one(query.sort)),
        }}
      />
    </main>
  );
}
