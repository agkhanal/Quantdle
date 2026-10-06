import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PostHog analytics goes through /ingest on our own domain, so ad blockers don't drop it.
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  // PostHog's API paths end in a slash; don't redirect them away.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
