import type { Metadata } from "next";
import { one, readQuery, type SearchParams } from "@/lib/page-query";
import { RESULT_COPY } from "@/lib/site";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await readQuery(searchParams);
  const token = one(query.token);
  const result = one(query.result);
  return (
    <main id="content" className="wrap">
      <p className="kicker">Friday letter</p>
      <h1>Unsubscribe</h1>
      {RESULT_COPY[result] ? <p className={`notice ${result === "invalid" || result === "not_saved" ? "error" : "ok"}`}>{RESULT_COPY[result]}</p> : null}
      {token ? (
        <form className="form" action="/api/newsletter/unsubscribe" method="post">
          <input type="hidden" name="token" value={token} />
          <p>This confirms the personal link. Typing someone else’s email will not unsubscribe them.</p>
          <button className="button primary" type="submit">Confirm unsubscribe</button>
        </form>
      ) : (
        <p className="empty">Use the unsubscribe link from your signup or from a future letter. There is no box to type an email address.</p>
      )}
    </main>
  );
}
