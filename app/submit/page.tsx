import type { Metadata } from "next";
import { SubmissionForm } from "@/components/forms";
import { one, readQuery, type SearchParams } from "@/lib/page-query";
import { RESULT_COPY } from "@/lib/site";

export const metadata: Metadata = {
  title: "Submit a plugin",
  description: "Send a guitar plugin for editorial review. Submissions are not published, and claimed prices are not treated as fact.",
};

export default async function SubmitPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await readQuery(searchParams);
  const result = one(query.result);
  return (
    <main id="content" className="wrap">
      <p className="kicker">Review queue</p>
      <h1>Submit a plugin</h1>
      <p className="lede">An editor checks the official page before anything is listed. A price you type here is not published.</p>
      {RESULT_COPY[result] ? <p className={`notice ${result === "saved" ? "ok" : "error"}`}>{RESULT_COPY[result]}</p> : null}
      <SubmissionForm />
    </main>
  );
}
