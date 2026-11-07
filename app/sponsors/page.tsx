import type { Metadata } from "next";
import { EnquiryForm } from "@/components/forms";
import { one, readQuery, type SearchParams } from "@/lib/page-query";
import { getRuntime } from "@/lib/runtime";
import { RESULT_COPY, sponsorStatsCopy } from "@/lib/site";
import { SPONSOR_OFFER } from "@/lib/types";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Introductory RiffRig sponsor placement is A$25 per week. No sponsor is booked, and stats are measured only when the database is connected.",
};

export default async function SponsorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const runtime = getRuntime();
  const query = await readQuery(searchParams);
  const result = one(query.result);
  let stats = sponsorStatsCopy({ mode: "unavailable" });
  if (runtime.mode === "postgres") {
    const [clicks, soldWeeks, pageviews] = await Promise.all([
      runtime.store.sponsorClickTotal(),
      runtime.store.soldWeekCount(),
      runtime.store.pageviewTotal(),
    ]);
    stats = sponsorStatsCopy({ mode: "measured", clicks, soldWeeks, pageviews });
  }
  return (
    <main id="content" className="wrap">
      <p className="kicker">Sponsors</p>
      <h1>A$25 a week</h1>
      <p className="lede">Introductory offer for a labelled site line plus a Friday-letter line. The letter line runs only in a week that is sold. Nothing is booked.</p>
      <section className="panel">
        <h2>What is included</h2>
        <ul>
          {SPONSOR_OFFER.includes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{stats}</p>
      </section>
      {RESULT_COPY[result] ? <p className={`notice ${result === "saved" ? "ok" : "error"}`}>{RESULT_COPY[result]}</p> : null}
      <section className="panel">
        <h2>Ask about a week</h2>
        <p className="note">The enquiry is stored for the owner. It does not send an email and it does not reserve a week.</p>
        <EnquiryForm />
      </section>
    </main>
  );
}
