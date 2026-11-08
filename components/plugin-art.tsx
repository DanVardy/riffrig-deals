"use client";

import { useEffect, useRef, useState } from "react";
import { pluginImage } from "@/lib/plugin-images";

export function PluginArt({ slug, name, vendor }: { slug: string; name: string; vendor: string }) {
  const art = pluginImage(slug);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [art]);

  if (!art || failed) {
    return (
      <div className="card-art" aria-hidden="true">
        <p className="meta">{vendor}</p>
        <p>{name}</p>
      </div>
    );
  }
  return (
    <div className="card-art card-art-photo">
      {/* A native image stays inside the fixed frame and can fall back when the file fails. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={art.src}
        alt={art.alt}
        width={art.width}
        height={art.height}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
