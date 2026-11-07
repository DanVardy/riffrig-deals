"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { filterEntries } from "@/lib/filter";
import { publicPrice } from "@/lib/price";
import { CATEGORY_LABELS, type Category, type Entry } from "@/lib/types";

type Props = {
  entries: Entry[];
  initialQuery: string;
  initialCategory: string;
  initialGenre: string;
};

export function CatalogueBrowser({ entries, initialQuery, initialCategory, initialGenre }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [genre, setGenre] = useState(initialGenre);
  const genres = useMemo(() => Array.from(new Set(entries.flatMap((entry) => entry.genreTags))).sort(), [entries]);
  const results = useMemo(() => filterEntries(entries, { query, category, genre }), [entries, query, category, genre]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || results.length > 0) return;
    const handle = window.setTimeout(() => {
      fetch("/api/search-misses", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ query: trimmed }),
      }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [query, results.length]);

  function push(next: { query: string; category: string; genre: string }) {
    const params = new URLSearchParams();
    if (next.query) params.set("q", next.query);
    if (next.category) params.set("category", next.category);
    if (next.genre) params.set("genre", next.genre);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <section aria-label="Catalogue">
      <div className="search">
        <label htmlFor="catalogue-search">Search plugins, vendors, or tools</label>
        <input
          id="catalogue-search"
          className="text-input"
          value={query}
          placeholder="Try reverb, Marshall, REAPER"
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            push({ query: next, category, genre });
          }}
        />
      </div>
      <div className="filters" role="toolbar" aria-label="Categories">
        <button type="button" className="chip" aria-pressed={category === ""} onClick={() => { setCategory(""); push({ query, category: "", genre }); }}>
          All
        </button>
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((key) => (
          <button
            key={key}
            type="button"
            className="chip"
            aria-pressed={category === key}
            onClick={() => {
              const next = category === key ? "" : key;
              setCategory(next);
              push({ query, category: next, genre });
            }}
          >
            {CATEGORY_LABELS[key]}
          </button>
        ))}
        {genres.map((tag) => (
          <button
            key={tag}
            type="button"
            className="chip"
            aria-pressed={genre === tag}
            onClick={() => {
              const next = genre === tag ? "" : tag;
              setGenre(next);
              push({ query, category, genre: next });
            }}
          >
            {tag}
          </button>
        ))}
      </div>
      <p className="count">{results.length} shown</p>
      {results.length === 0 ? (
        <p className="empty">No catalogue entry matches that search.</p>
      ) : (
        <div className="cards">
          {results.map((entry) => {
            const price = publicPrice(entry);
            return (
              <article className="card" key={entry.slug}>
                <p className="kicker">{CATEGORY_LABELS[entry.category]}</p>
                <h2>
                  <Link href={`/plugins/${entry.slug}`}>{entry.name}</Link>
                </h2>
                <p className="meta">{entry.vendor}</p>
                <p className="summary">{entry.summary}</p>
                <div className="row">
                  <span className={`pill${price.verified ? (price.label === "Free" ? " free" : " checked") : ""}`}>{price.label}</span>
                  {entry.genreTags.map((tag) => (
                    <span className="pill" key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="card-links">
                  <Link href={`/plugins/${entry.slug}`}>Details</Link>
                  <a href={entry.officialUrl} rel="noopener noreferrer" target="_blank">Vendor page</a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
