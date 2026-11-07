export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export function simplePage(title: string, body: string): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><body style="margin:0;background:#1a1612;color:#f6f0e6;font-family:Georgia,serif"><main style="max-width:36rem;margin:0 auto;padding:2rem 1.1rem"><h1>${escapeHtml(title)}</h1>${body}<p><a style="color:#ffd27a" href="/">Back to RiffRig Deals</a></p></main>`;
}
