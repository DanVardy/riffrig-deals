"use client";

import { useState } from "react";
import { pluginDemo } from "@/lib/plugin-demos";

export function PluginDemo({ slug }: { slug: string }) {
  const demo = pluginDemo(slug);
  const [playing, setPlaying] = useState(false);
  if (!demo) return null;
  const src = `https://www.youtube-nocookie.com/embed/${demo.youtubeId}?rel=0`;
  return (
    <figure className="card-demo">
      <div className="card-demo-frame">
        {playing ? (
          <iframe
            src={src}
            title={demo.title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)}>
            {/* Poster is YouTube's own preview for this official video. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${demo.youtubeId}/hqdefault.jpg`} alt="" />
            <span>Play company demo</span>
          </button>
        )}
      </div>
      <figcaption className="meta">{demo.channel}: {demo.title}</figcaption>
    </figure>
  );
}
