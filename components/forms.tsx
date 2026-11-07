"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CONSENT_TEXT } from "@/lib/types";

type Kind = "idle" | "ok" | "warn" | "error";

function useFormState() {
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState<Kind>("idle");
  const [text, setText] = useState("");
  const [href, setHref] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setPending(true);
    setKind("idle");
    setHref(null);
    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await response.json()) as { message?: string; persisted?: boolean; provider?: string; unsubscribePath?: string };
      setText(body.message || "Check the form and try again.");
      setKind(body.persisted ? (body.provider === "failed" ? "warn" : "ok") : "error");
      setHref(typeof body.unsubscribePath === "string" ? body.unsubscribePath : null);
      if (body.persisted) form.reset();
    } catch {
      setKind("error");
      setText("Not saved. Nothing was stored and no email was sent.");
    } finally {
      setPending(false);
    }
  }

  return { pending, kind, text, href, submit };
}

function Status({ kind, text, href }: { kind: Kind; text: string; href: string | null }) {
  if (!text) return null;
  return (
    <p className={`status ${kind === "idle" ? "" : kind}`} role="status">
      {text} {href ? <Link href={href}>Save your unsubscribe link</Link> : null}
    </p>
  );
}

export function SignupForm({ source }: { source: "home" | "newsletter" }) {
  const state = useFormState();
  return (
    <form className="form" action="/api/newsletter/signup" method="post" onSubmit={state.submit}>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company_url" defaultValue="" />
      <input type="hidden" name="source" value={source} />
      <label htmlFor={`email-${source}`}>Email</label>
      <input id={`email-${source}`} className="text-input" name="email" type="email" autoComplete="email" required maxLength={254} />
      <label className="check-row">
        <input name="consent" type="checkbox" value="yes" required />
        <span>{CONSENT_TEXT}</span>
      </label>
      <button className="button primary" type="submit" disabled={state.pending}>
        {state.pending ? "Saving" : "Record pending signup"}
      </button>
      <Status kind={state.kind} text={state.text} href={state.href} />
    </form>
  );
}

export function SubmissionForm() {
  const state = useFormState();
  return (
    <form className="form" action="/api/submissions" method="post" onSubmit={state.submit}>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company_url" defaultValue="" />
      <label htmlFor="vendor">Vendor</label>
      <input id="vendor" name="vendor" className="text-input" required minLength={2} maxLength={80} />
      <label htmlFor="plugin-name">Plugin or tool</label>
      <input id="plugin-name" name="name" className="text-input" required minLength={2} maxLength={120} />
      <label htmlFor="category">Category</label>
      <select id="category" name="category" className="text-input" defaultValue="amp-sim">
        <option value="amp-sim">Amp sim</option>
        <option value="effects">Effects</option>
        <option value="cabinet-ir">Cabinet IR</option>
        <option value="recording">Recording</option>
        <option value="amp-capture">Amp capture</option>
      </select>
      <label htmlFor="official-url">Official https page</label>
      <input id="official-url" name="officialUrl" type="url" className="text-input" required placeholder="https://" />
      <label htmlFor="note">What should we check?</label>
      <textarea id="note" name="note" maxLength={500} />
      <button className="button primary" type="submit" disabled={state.pending}>
        {state.pending ? "Saving" : "Submit for review"}
      </button>
      <Status kind={state.kind} text={state.text} href={null} />
    </form>
  );
}

export function EnquiryForm() {
  const state = useFormState();
  return (
    <form className="form" action="/api/enquiries" method="post" onSubmit={state.submit}>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company_url" defaultValue="" />
      <label htmlFor="enquiry-name">Name</label>
      <input id="enquiry-name" name="name" className="text-input" required minLength={2} maxLength={80} />
      <label htmlFor="enquiry-email">Email</label>
      <input id="enquiry-email" name="email" type="email" className="text-input" required maxLength={254} />
      <label htmlFor="enquiry-org">Organisation, if any</label>
      <input id="enquiry-org" name="organisation" className="text-input" maxLength={80} />
      <label htmlFor="enquiry-message">What do you want to run?</label>
      <textarea id="enquiry-message" name="message" required minLength={10} maxLength={1000} />
      <button className="button primary" type="submit" disabled={state.pending}>
        {state.pending ? "Saving" : "Save enquiry"}
      </button>
      <Status kind={state.kind} text={state.text} href={null} />
    </form>
  );
}
