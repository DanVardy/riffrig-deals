import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Outfit } from "next/font/google";
import { PageviewBeacon, SponsorBar } from "@/components/chrome";
import { getRuntime } from "@/lib/runtime";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const description =
    "Cross-genre guitar plugin tracker. Metal is a filter, not the whole list. Prices appear only after a check on the vendor's own page.";
  return {
    metadataBase: siteUrl(),
    title: { default: "RiffRig Deals", template: "%s · RiffRig Deals" },
    description,
    applicationName: "RiffRig Deals",
    openGraph: {
      title: "RiffRig Deals",
      description,
      siteName: "RiffRig Deals",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: { card: "summary_large_image", title: "RiffRig Deals", description, images: ["/opengraph-image"] },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const runtime = getRuntime();
  const sponsor = runtime.mode === "postgres" ? await runtime.store.activeSponsor() : null;
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className={sponsor ? "has-sponsor" : undefined}>
        <a className="skip" href="#content">Skip to content</a>
        <PageviewBeacon />
        {runtime.mode === "fail-closed" ? (
          <main id="content" className="wrap">
            <h1>RiffRig Deals is not available</h1>
            <p>This production copy has no database configured. Nothing is being saved or shown as if it were.</p>
          </main>
        ) : (
          <>
            <header className="site-header">
              <div className="bar">
                <Link className="logo" href="/">
                  <span className="led" aria-hidden="true" />
                  RiffRig <span>Deals</span>
                </Link>
              </div>
              <nav className="nav-scroll" aria-label="Primary">
                <Link href="/deals">Deals</Link>
                <Link href="/catalogue">Catalogue</Link>
                <Link href="/newsletter">Friday letter</Link>
                <Link href="/submit">Submit</Link>
                <Link href="/sponsors">Sponsors</Link>
              </nav>
            </header>
            {runtime.mode === "preview" ? (
              <p className="banner" role="status">
                Database-less preview. The catalogue is readable, but submissions, signups, and enquiries are not saved on this copy.
              </p>
            ) : null}
            {children}
            <footer className="site-footer">
              <p>RiffRig Deals is independent. Product names are here so you can find the right page. We are not those companies.</p>
              <p>Source links go to the vendor’s own site. There are no affiliate links. Paid placements will be labelled Sponsored.</p>
              <p>A verified sale with no published end date is eligible and labelled “expiry unknown”. Unchecked prices stay off the page.</p>
            </footer>
            {sponsor ? <SponsorBar name={sponsor.name} slug={sponsor.slug} /> : null}
          </>
        )}
      </body>
    </html>
  );
}
