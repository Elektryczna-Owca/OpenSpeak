import type { NextConfig } from "next";

// Serve the app under a subpath (e.g. "/run") by setting NEXT_PUBLIC_BASE_PATH
// at build time. Client code reads the same variable via src/lib/base-path.ts.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// The dev server blocks its client resources for any host other than
// localhost, so opening it by LAN IP (e.g. the control page on a phone) loads
// a dead, non-hydrated page. List extra hosts comma-separated in
// ALLOWED_DEV_ORIGINS (e.g. in .env.local). Ignored by production builds.
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  basePath,
  allowedDevOrigins,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
