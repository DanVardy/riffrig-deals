import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageviewBeacon, SponsorBar } from "@/components/chrome";
import { publicRobots } from "@/lib/indexing";
import { getRuntime } from "@/lib/runtime";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const description = "Find guitar plugins and check the seller’s price before you buy. Verified offers stay separate from the rest of the catalogue.";
  return {
    metadataBase: siteUrl(),
    title: { default: "Guitar Plugin Deals", template: "%s · Guitar Plugin Deals" },
    description,
    applicationName: "Guitar Plugin Deals",
    openGraph: {
      title: "Guitar Plugin Deals",
      description,
      siteName: "Guitar Plugin Deals",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: { card: "summary_large_image", title: "Guitar Plugin Deals", description, images: ["/opengraph-image"] },
    robots: publicRobots(),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const runtime = getRuntime();
  const sponsor = runtime.mode === "postgres" ? await runtime.store.activeSponsor() : null;
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">Skip to content</a>
        <PageviewBeacon />
        {runtime.mode === "fail-closed" ? (
          <main id="content" className="wrap">
            <h1>Guitar Plugin Deals is not available</h1>
            <p>This production copy has no database configured. Nothing is being saved or shown as if it were.</p>
          </main>
        ) : (
          <>
            <header className="site-header">
              <div className="header-inner">
                <Link className="logo" href="/">
                  <Image src="/brand/guitar-plugin-deals-logo.png" width={255} height={80} alt="Guitar Plugin Deals" priority />
                </Link>
                <nav className="nav-primary" aria-label="Primary">
                  <Link href="/deals">Deals</Link>
                  <Link href="/catalogue">All plugins</Link>
                </nav>
              </div>
            </header>
            {sponsor ? <SponsorBar name={sponsor.name} slug={sponsor.slug} /> : null}
            {runtime.mode === "preview" ? (
              <p className="banner" role="status">
                Database-less preview. The catalogue is readable, but submissions, signups, and enquiries are not saved on this copy.
              </p>
            ) : null}
            {children}
            <footer className="site-footer">
              <div className="footer-inner">
                <nav className="footer-links" aria-label="More">
                  <Link href="/deals">Deals</Link>
                  <Link href="/catalogue">All plugins</Link>
                  <Link href="/newsletter">Friday letter</Link>
                  <Link href="/submit">Submit</Link>
                  <Link href="/sponsors">Sponsors</Link>
                </nav>
                <p>Guitar Plugin Deals is independent. Product names are here so you can find the right page. We are not those companies.</p>
                <p>Source links go to the seller’s own site. There are no affiliate links. Paid placements will be labelled Sponsored.</p>
                <p>A verified sale with no published end date is labelled “expiry unknown”. Entries without a checked price say the current price is not verified.</p>
              </div>
            </footer>
          </>
        )}
      </body>
    </html>
  );
}
