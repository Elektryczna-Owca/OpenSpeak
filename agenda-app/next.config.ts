import type { NextConfig } from "next";

// Serve the app under a subpath (e.g. "/run") by setting NEXT_PUBLIC_BASE_PATH
// at build time. Client code reads the same variable via src/lib/base-path.ts.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "standalone",
  basePath,
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
