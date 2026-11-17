import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  experimental: {
    // Payment proofs are uploaded through a Server Action; the limit is 5 MB plus form overhead.
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
