import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output required for Docker multi-stage build (copies only runtime deps)
  output: "standalone",
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  // No component in this app uses next/image, so the /_next/image optimizer is dead
  // weight that still ships a live endpoint. Turning it off makes the sharp/libvips
  // CVEs and the SVG image-optimization DoS structurally unreachable rather than
  // merely unused - see docs/security-advisories.md.
  images: { unoptimized: true },
};

export default nextConfig;
