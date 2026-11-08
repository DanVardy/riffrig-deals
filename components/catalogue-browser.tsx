"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PluginCard } from "@/components/plugin-card";
import { catalogueHref, type CatalogueQuery } from "@/lib/catalogue-query";
import { filterEntries, sortEntries, type CatalogueSort, type DealFilter } from "@/lib/filter";
import { CATEGORY_LABELS, type Category, type Entry } from "@/lib/types";

type Applied = CatalogueQuery;

export function CatalogueBrowser({ entries, initial }: { entries: Entry[]; initial: Applied }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [genre, setGenre] = useState(initial.genre);
  const [vendor, setVendor] = useState(initial.vendor);
  const [deal, setDeal] = useState<DealFilter>(initial.deal);
  const [sort, setSort] = useState<CatalogueSort>(initial.sort);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState<Applied>(initial);
  const [announcement, setAnnouncement] = useState("");
  const filtersButton = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const vendors = useMemo(() => Array.from(new Set(entries.map((entry) => entry.vendor))).sort((a, b) => a.localeCompare(b)), [entries]);
  const genres = useMemo(() => Array.from(new Set(entries.flatMap((entry) => entry.genreTags))).sort(), [entries]);
  const applied: Applied = { q: query, category, genre, vendor, deal, sort };
  const results = useMemo(
    () => sortEntries(filterEntries(entries, { query, category, genre, vendor, deal }), sort),
    [entries, query, category, genre, vendor, deal, sort],
  );
  const returnTo = catalogueHref(applied);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setAnnouncement(`${results.length} plugin${results.length === 1 ? "" : "s"} shown.`);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [results.length]);

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

  useEffect(() => {
    try {
      const savedPath = window.sessionStorage.getItem("guitar-plugin-deals-scroll-path");
      const savedY = window.sessionStorage.getItem("guitar-plugin-deals-scroll");
      if (savedPath === window.location.pathname + window.location.search && savedY) {
        window.scrollTo(0, Number(savedY));
      }
    } catch {
      /* ignore */
    }
  }, [pathname]);

  function commit(next: Applied, message?: string) {
    setQuery(next.q);
    setCategory(next.category);
    setGenre(next.genre);
    setVendor(next.vendor);
    setDeal(next.deal);
    setSort(next.sort);
    const href = catalogueHref(next);
    router.replace(href, { scroll: false });
    if (message) setAnnouncement(message);
  }

  function openSheet() {
    setPending(applied);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    filtersButton.current?.focus();
  }

  function applySheet() {
    commit(pending);
    closeSheet();
  }

  function clearFilters() {
    commit({ q: "", category: "", genre: "", vendor: "", deal: "", sort: "name" }, "Filters cleared.");
    setSheetOpen(false);
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>("button, a, input, select, textarea") ?? []).filter((node) => !node.hasAttribute("disabled"));
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [sheetOpen]);

  const chips = [
    category ? { key: "category", label: CATEGORY_LABELS[category as Category] ?? category } : null,
    vendor ? { key: "vendor", label: vendor } : null,
    genre ? { key: "genre", label: genre } : null,
    deal === "verified" ? { key: "deal", label: "Verified deal" } : null,
    deal === "unverified" ? { key: "deal", label: "No verified current deal" } : null,
    sort === "name-desc" ? { key: "sort", label: "Name Z–A" } : null,
  ].filter((chip): chip is { key: string; label: string } => Boolean(chip));

  function removeChip(key: string) {
    commit({
      ...applied,
      category: key === "category" ? "" : category,
      vendor: key === "vendor" ? "" : vendor,
      genre: key === "genre" ? "" : genre,
      deal: key === "deal" ? "" : deal,
      sort: key === "sort" ? "name" : sort,
    });
  }

  function controls(state: Applied, update: (next: Applied) => void, idPrefix: string) {
    return (
      <>
        <div className="field">
          <label htmlFor={`${idPrefix}-category`}>Category</label>
          <select id={`${idPrefix}-category`} value={state.category} onChange={(event) => update({ ...state, category: event.target.value })}>
            <option value="">All categories</option>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((key) => (
              <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-vendor`}>Developer</label>
          <select id={`${idPrefix}-vendor`} value={state.vendor} onChange={(event) => update({ ...state, vendor: event.target.value })}>
            <option value="">All developers</option>
            {vendors.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-genre`}>Genre</label>
          <select id={`${idPrefix}-genre`} value={state.genre} onChange={(event) => update({ ...state, genre: event.target.value })}>
            <option value="">All genres</option>
            {genres.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-deal`}>Deal status</label>
          <select id={`${idPrefix}-deal`} value={state.deal} onChange={(event) => update({ ...state, deal: event.target.value as DealFilter })}>
            <option value="">Any deal status</option>
            <option value="verified">Verified deal</option>
            <option value="unverified">No verified current deal</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-sort`}>Sort</label>
          <select id={`${idPrefix}-sort`} value={state.sort} onChange={(event) => update({ ...state, sort: event.target.value as CatalogueSort })}>
            <option value="name">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </select>
        </div>
      </>
    );
  }

  return (
    <section aria-label="Catalogue">
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="search">
        <label htmlFor="catalogue-search">Search plugins</label>
        <input
          id="catalogue-search"
          className="text-input"
          value={query}
          placeholder="Name, developer, or description"
          onChange={(event) => commit({ ...applied, q: event.target.value })}
        />
      </div>
      <button ref={filtersButton} type="button" className="button filters-button" onClick={openSheet} aria-expanded={sheetOpen} aria-controls="filter-sheet">
        Filters
      </button>
      <div className="toolbar desktop-filters">
        {controls(applied, commit, "desktop")}
      </div>
      {chips.length > 0 ? (
        <div className="chips" aria-label="Active filters">
          {chips.map((chip) => (
            <button key={chip.key} type="button" className="chip" onClick={() => removeChip(chip.key)}>
              {chip.label} <span aria-hidden="true">×</span>
              <span className="sr-only">Remove {chip.label}</span>
            </button>
          ))}
          <button type="button" className="chip" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : null}
      <p className="count">{results.length} shown</p>
      {results.length === 0 ? (
        <div className="empty">
          <p>No plugins match these filters.</p>
          <button type="button" className="button" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div className="cards">
          {results.map((entry) => (
            <PluginCard key={entry.slug} entry={entry} returnTo={returnTo} />
          ))}
        </div>
      )}
      {sheetOpen ? (
        <div className="sheet" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSheet(); }}>
          <div
            ref={dialogRef}
            id="filter-sheet"
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <h2 id={titleId}>Filters</h2>
            <div className="toolbar">
              {controls(pending, setPending, "sheet")}
            </div>
            <div className="sheet-actions">
              <button type="button" className="button primary" onClick={applySheet}>Apply filters</button>
              <button type="button" className="button" onClick={clearFilters}>Clear filters</button>
              <button type="button" className="button" onClick={closeSheet}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
