import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: process.env.STORAGE_HOSTNAME || "images.unsplash.com" },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
