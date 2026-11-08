import Link from "next/link";
import { PluginArt } from "@/components/plugin-art";
import { FREE_STAGE_LABELS, type FreeTool } from "@/lib/free-software";

export function FreeCard({ tool }: { tool: FreeTool }) {
  return (
    <article className="card">
      {tool.catalogueSlug ? (
        <PluginArt slug={tool.catalogueSlug} name={tool.name} vendor={tool.vendor} />
      ) : (
        <div className="card-art" aria-hidden="true">
          <p className="meta">{tool.vendor}</p>
          <p>{tool.name}</p>
        </div>
      )}
      <p className="meta">{FREE_STAGE_LABELS[tool.stage]} · {tool.vendor}</p>
      <h2>{tool.name}</h2>
      <p className="summary">{tool.summary}</p>
      <p className="status">{tool.restrictionLabel}</p>
      <p className="meta">{tool.platformLabel}</p>
      <p>{tool.requirements}</p>
      <p className="meta">Checked {tool.checkedOn} on the seller’s page. {tool.sourceNote}</p>
      <div className="card-actions">
        <a className="button primary" href={tool.officialUrl} rel="noopener noreferrer" target="_blank">Get free software</a>
        {tool.catalogueSlug ? <Link className="button" href={`/plugins/${tool.catalogueSlug}?return=${encodeURIComponent("/free")}`}>View catalogue entry</Link> : null}
      </div>
    </article>
  );
}
