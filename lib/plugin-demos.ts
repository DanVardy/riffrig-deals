import demos from "@/data/plugin-demos.json";

export type PluginDemo = {
  youtubeId: string;
  title: string;
  channel: string;
  sourcePage: string;
  watchUrl: string;
};

const bySlug = demos as Record<string, PluginDemo>;

export function pluginDemo(slug: string): PluginDemo | null {
  return bySlug[slug] ?? null;
}
