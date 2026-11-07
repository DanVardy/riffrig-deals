import type { Metadata } from "next";
import { SignupForm } from "@/components/forms";
import { buildFridayNewsletter } from "@/lib/newsletter";
import { getRuntime } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Friday letter",
  description: "Consent to a pending Friday guitar-plugin letter. Nothing is emailed until sending is confirmed.",
};

export default async function NewsletterPage() {
  const runtime = getRuntime();
  const entries = runtime.mode === "fail-closed" ? [] : await runtime.store.listEntries();
  const sponsor = runtime.mode === "postgres" ? await runtime.store.activeSponsor() : null;
  const issue = buildFridayNewsletter({
    entries,
    issueDate: "preview",
    sponsor: sponsor ? { name: sponsor.name, sold: true } : null,
  });
  return (
    <main id="content" className="wrap">
      <p className="kicker">Friday letter</p>
      <h1>Five picks, not a blast</h1>
      <p className="lede">Signup stores your consent and the page you used. It does not send mail, and a suppressed address is not added again.</p>
      <SignupForm source="newsletter" />
      <section className="panel">
        <h2>Preview of the letter</h2>
        <p className="note">{issue.subject}. This preview is not sent.</p>
        <p>{issue.picks.length ? "The current five:" : "No picks are available."}</p>
        <ol>
          {issue.picks.map((pick) => (
            <li key={pick.name}>
              <strong>{pick.name}</strong> — {pick.vendor}. {pick.line}
            </li>
          ))}
        </ol>
        {issue.sponsorLine ? <p>{issue.sponsorLine}</p> : <p className="note">No sponsor line. One is added only for a week that has actually been sold.</p>}
      </section>
    </main>
  );
}
