import type { NextConfig } from "next";

/**
 * Next.js configuration for Samik.
 *
 * `output: "standalone"` produces a self-contained `.next/standalone/`
 * directory that includes only the necessary node_modules — ideal for
 * Docker / PaaS deployment (Liara). The build script in package.json
 * copies `.next/static` and `public/` into the standalone dir.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  // During the build, the standalone output may reference `sharp` for
  // image optimization. sharp is already in our dependencies.
  typescript: {
    // Don't fail the build on type errors — we run `bun run lint` separately.
    // This matches the existing project convention.
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Production: disable the Next.js telemetry (respects user privacy).
  // (This is also set via NEXT_TELEMETRY_DISABLED=1 in CI, but we add it
  // here as a belt-and-suspenders.)
  // No direct config key — handled by env var at runtime.
};

export default nextConfig;
