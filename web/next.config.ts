import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root has its own package-lock.json; pin the workspace root to this app.
  turbopack: { root: __dirname },
};

export default nextConfig;
