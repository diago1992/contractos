import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use empty turbopack config to opt into Turbopack (Next.js 16 default)
  turbopack: {},
  // Allow Supabase storage URLs for images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Mark server-only packages as external for API routes
  serverExternalPackages: ["pdf-parse", "@slack/web-api", "@anthropic-ai/sdk"],
  // Optimize tree-shaking for large client packages
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
