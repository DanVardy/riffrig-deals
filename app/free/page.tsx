import type { Metadata } from "next";
import Link from "next/link";
import { FreeCard } from "@/components/free-card";
import { FREE_STAGE_INTRO, FREE_STAGE_LABELS, FREE_STAGES, filterFreeTools, freeTools, isFreePlatform, isFreeStage } from "@/lib/free-software";
import { one, type SearchParams } from "@/lib/page-query";

export const metadata: Metadata = {
  title: "Free guitar software",
  description: "A checked starter set of free guitar software: a host, an amp, a cabinet loader, effects, and capture tools. Paid editions stay in the catalogue.",
};

export default async function FreePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const stage = one(query.stage);
  const platform = one(query.platform);
  const selectedStage = isFreeStage(stage) ? stage : "";
  const selectedPlatform = isFreePlatform(platform) ? platform : "";
  const shown = filterFreeTools(selectedStage, selectedPlatform);
  const grouped = FREE_STAGES.filter((item) => !selectedStage || item === selectedStage).map((item) => ({
    stage: item,
    tools: shown.filter((tool) => tool.stage === item),
  })).filter((group) => group.tools.length > 0);

  return (
    <main id="content" className="wrap">
      <div className="home-intro">
        <h1>Free software for a guitar setup</h1>
        <p className="lede prose">These are free editions checked on the seller’s own page. Add them in order if you want: host, amp, cabinet, effects, then capture. Nothing here is a trial. A free edition is not the paid plugin with a similar name.</p>
        <p className="note">This site does not host installers, and it does not claim that every tool runs on every computer or together with every other tool. Commercial-use terms were not audited.</p>
      </div>
      <form className="free-filters" action="/free" method="get">
        <div>
          <label htmlFor="free-stage">Step</label>
          <select id="free-stage" name="stage" defaultValue={selectedStage}>
            <option value="">All steps</option>
            {FREE_STAGES.map((item) => (
              <option key={item} value={item}>{FREE_STAGE_LABELS[item]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="free-platform">Platform named by the seller</label>
          <select id="free-platform" name="platform" defaultValue={selectedPlatform}>
            <option value="">Any</option>
            <option value="windows">Windows</option>
            <option value="macos">macOS</option>
            <option value="linux">Linux</option>
          </select>
        </div>
        <button className="button" type="submit">Show</button>
      </form>
      <p className="meta" role="status">{shown.length} of {freeTools.length} shown. A platform filter hides tools whose page did not name that system.</p>
      {grouped.length === 0 ? (
        <div className="empty">
          <p>Nothing in this starter set matched.</p>
          <Link href="/free">Clear filters</Link>
        </div>
      ) : (
        grouped.map((group) => (
          <section className="section" key={group.stage} aria-labelledby={`stage-${group.stage}`}>
            <h2 id={`stage-${group.stage}`}>{FREE_STAGE_LABELS[group.stage]}</h2>
            <p className="lede prose">{FREE_STAGE_INTRO[group.stage]}</p>
            <div className="cards">
              {group.tools.map((tool) => (
                <FreeCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        ))
      )}
      <section className="section prose">
        <h2>Paid software is still here</h2>
        <p>A checked sale is listed separately. The catalogue also has plugins whose current price is not verified.</p>
        <div className="actions">
          <Link className="button" href="/deals">See verified deals</Link>
          <Link href="/catalogue">Browse all plugins</Link>
        </div>
      </section>
    </main>
  );
}
