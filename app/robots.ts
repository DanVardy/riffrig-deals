import type { MetadataRoute } from "next";
import { robotsPolicy } from "@/lib/indexing";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return robotsPolicy(siteUrl().origin);
}
