import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_LABELS } from "@/lib/types";
import { publicPrice, expiryLabel, isVerifiedSale } from "@/lib/price";
import { getRuntime } from "@/lib/runtime";

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

export default async function PluginPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const runtime = getRuntime();
  if (runtime.mode === "fail-closed") return null;
  const entry = await runtime.store.getEntry(slug);
  if (!entry) notFound();
  const price = publicPrice(entry);
  return (
    <main id="content" className="wrap">
      <p className="kicker">{CATEGORY_LABELS[entry.category]}</p>
      <h1>{entry.name}</h1>
      <p className="lede">{entry.vendor}. {entry.summary}</p>
      <dl className="facts">
        <div>
          <dt>Current price</dt>
          <dd>{price.label}</dd>
        </div>
        {price.listLabel ? (
          <div>
            <dt>List price</dt>
            <dd>{price.listLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt>Checked</dt>
          <dd>{price.checkedLabel ?? price.detail}</dd>
        </div>
        <div>
          <dt>Sale</dt>
          <dd>{isVerifiedSale(entry) ? expiryLabel(entry) : "Not a verified sale"}</dd>
        </div>
        <div>
          <dt>Plugin format and operating system</dt>
          <dd>{entry.osFormats ?? "Not verified"}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{entry.genreTags.length ? entry.genreTags.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt>Official page</dt>
          <dd><a href={entry.officialUrl} rel="noopener noreferrer" target="_blank">{entry.officialUrl}</a></dd>
        </div>
      </dl>
      {entry.sourceNote ? <p className="note">{entry.sourceNote}</p> : null}
      <p className="note">This link is the vendor’s own page, not an affiliate link.</p>
    </main>
  );
}
