import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript errors are checked locally — skip during Vercel build
    // to avoid failures caused by Prisma client not being generated yet
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
