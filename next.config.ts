import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tenant subdomains (e.g. escritorio.lvh.me) hit the dev server from a
  // different origin than localhost; allow-list them for local dev.
  allowedDevOrigins: ["lvh.me", "*.lvh.me"],
};

export default nextConfig;
