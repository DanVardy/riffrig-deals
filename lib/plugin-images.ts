import sources from "@/data/plugin-image-sources.json";

export type PluginImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

const images: Record<string, PluginImage> = Object.fromEntries(
  Object.entries(sources).map(([slug, source]) => [
    slug,
    { src: source.src, width: source.width, height: source.height, alt: source.alt },
  ]),
);

export function pluginImage(slug: string): PluginImage | null {
  return images[slug] ?? null;
}
