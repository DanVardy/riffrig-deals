import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { safeReturnPath } from "@/lib/catalogue-query";
import { CATEGORY_LABELS } from "@/lib/types";
import { publicPrice, expiryLabel, isVerifiedSale } from "@/lib/price";
import { getRuntime } from "@/lib/runtime";
import { one, readQuery, type SearchParams } from "@/lib/page-query";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return { title: "Unavailable" };
  const entry = await runtime.store.getEntry(slug);
  if (!entry) return { title: "Not found" };
  return {
    title: `${entry.name} by ${entry.vendor}`,
    description: `${entry.summary} Price: ${publicPrice(entry).label}.`,
  };
}

export default async function PluginPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const query = await readQuery(searchParams);
  const back = safeReturnPath(one(query.return));
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return null;
  const entry = await runtime.store.getEntry(slug);
  if (!entry) notFound();
  const price = publicPrice(entry);
  const sale = isVerifiedSale(entry);
  const sellerLabel = sale ? `View deal at ${entry.vendor}` : "Check seller price";
  return (
    <main id="content" className="wrap">
      <p className="meta"><Link href={back}>Back to results</Link></p>
      <div className="detail-grid">
        <div>
          <p className="meta">{CATEGORY_LABELS[entry.category]} · {entry.vendor}</p>
          <h1>{entry.name}</h1>
          <div className="card-art" aria-hidden="true">
            <p className="meta">{entry.vendor}</p>
            <p>{entry.name}</p>
          </div>
          <p className="lede">{entry.summary}</p>
          <dl className="facts">
            <div>
              <dt>Plugin format and operating system</dt>
              <dd>{entry.osFormats ?? "Not verified"}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>{entry.genreTags.length ? entry.genreTags.join(", ") : "None"}</dd>
            </div>
          </dl>
          {entry.sourceNote ? <p className="note">{entry.sourceNote}</p> : null}
        </div>
        <aside className="evidence" aria-label="Price evidence">
          <p className={`status${sale || price.label === "Free" ? " verified" : ""}`}>
            {sale ? "Verified deal" : price.verified ? (price.label === "Free" ? "Free" : "Verified price") : "No verified current deal"}
          </p>
          {price.label === "Price checked" ? (
            <p>{price.detail}</p>
          ) : (
            <>
              <p className={price.verified && (price.label === "Free" || /\d/.test(price.label)) ? "price" : "lede"}>{price.verified ? price.label : "Current price not verified"}</p>
              <p>{price.checkedLabel ?? "Check date unavailable"}</p>
            </>
          )}
          {price.listLabel && sale ? <p>List price {price.listLabel}</p> : null}
          <p>{sale ? expiryLabel(entry) : "Not a verified sale"}</p>
          <a className="button primary" href={entry.officialUrl} rel="noopener noreferrer" target="_blank">{sellerLabel}</a>
          <p className="note">This link goes to the seller’s own page. It is not an affiliate link.</p>
          {entry.priceSourceUrl ? <p className="note">Price source: {entry.priceSourceUrl}</p> : null}
        </aside>
      </div>
    </main>
  );
}
