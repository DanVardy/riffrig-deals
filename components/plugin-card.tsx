"use client";

import Link from "next/link";
import { PluginArt } from "@/components/plugin-art";
import { CATEGORY_LABELS } from "@/lib/types";
import type { Entry } from "@/lib/types";
import { expiryLabel, isVerifiedSale, publicPrice } from "@/lib/price";

export function rememberCatalogueScroll() {
  try {
    window.sessionStorage.setItem("guitar-plugin-deals-scroll", String(window.scrollY));
    window.sessionStorage.setItem("guitar-plugin-deals-scroll-path", window.location.pathname + window.location.search);
  } catch {
    /* storage can be unavailable */
  }
}

export function PluginCard({ entry, returnTo }: { entry: Entry; returnTo: string }) {
  const price = publicPrice(entry);
  const sale = isVerifiedSale(entry);
  const href = `/plugins/${entry.slug}?return=${encodeURIComponent(returnTo)}`;
  const sellerLabel = sale ? `View deal at ${entry.vendor}` : "Check seller price";
  const amount = price.verified && (price.label === "Free" || /\d/.test(price.label));
  const status = sale ? `Verified deal. ${expiryLabel(entry)}` : price.label === "Free" ? "Free" : price.verified ? "Verified price" : "No verified current deal";
  return (
    <article className="card">
      <PluginArt slug={entry.slug} name={entry.name} vendor={entry.vendor} />
      <p className="meta">{CATEGORY_LABELS[entry.category]} · {entry.vendor}</p>
      <h2>{entry.name}</h2>
      <p className="summary">{entry.summary}</p>
      <p className={`status${sale || price.label === "Free" ? " verified" : ""}`}>{status}</p>
      <p className={amount ? "price" : "lede"}>{price.verified ? price.label : "Current price not verified"}</p>
      {price.verified && !amount ? <p className="meta">{price.detail}</p> : null}
      {price.listLabel && sale ? <p className="meta">List price {price.listLabel}</p> : null}
      <p className="meta">{price.checkedLabel ?? "Check date unavailable"}</p>
      <div className="card-actions">
        <Link className="button primary" href={href} onClick={rememberCatalogueScroll}>View details</Link>
        <a className="button" href={entry.officialUrl} rel="noopener noreferrer" target="_blank">{sellerLabel}</a>
      </div>
    </article>
  );
}
