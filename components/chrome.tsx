"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const seen = new Set<string>();

export function PageviewBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || seen.has(pathname)) return;
    seen.add(pathname);
    fetch("/api/pageviews", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}

export function SponsorBar({ name, slug }: { name: string; slug: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (window.sessionStorage.getItem("riffrig-sponsor-closed") === "1") setOpen(false);
  }, []);
  if (!open) return null;
  return (
    <aside className="sponsor-bar" aria-label="Sponsored">
      <p>
        <strong>Sponsored.</strong> {name}
      </p>
      <Link href={`/go/${slug}`}>Visit sponsor</Link>
      <button
        type="button"
        onClick={() => {
          window.sessionStorage.setItem("riffrig-sponsor-closed", "1");
          setOpen(false);
        }}
      >
        Close
      </button>
    </aside>
  );
}
