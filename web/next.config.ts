import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root has its own package-lock.json; pin the workspace root to this app.
  turbopack: { root: __dirname },
  // Nothing is cached unless marked "use cache"; the question bank is (lib/bank.ts), learner data is not.
  cacheComponents: true,
};

export default nextConfig;
