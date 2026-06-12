import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output required for Docker multi-stage build (copies only runtime deps)
  output: "standalone",
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
};

export default nextConfig;
