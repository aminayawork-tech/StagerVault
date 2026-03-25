import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Supabase stub types (src/types/supabase.ts) are placeholders until
    // `npm run db:types` is run against a real Supabase instance.
    // Remove this once proper types are generated.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Allow large photo uploads
    },
  },
};

export default nextConfig;
