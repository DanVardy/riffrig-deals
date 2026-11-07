import type { NextConfig } from "next";
import { robotTagHeader } from "./lib/indexing";

const robotHeader = robotTagHeader();

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(robotHeader ? [robotHeader] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
