import type { NextConfig } from "next";

const allowLocalImages = process.env.NEXT_ALLOW_LOCAL_IMAGES === "true";

const nextConfig: NextConfig = {
  images: {
    // Allow local/private IP image optimization in local dev and explicit local build testing.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development" || allowLocalImages,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/books4all-uploads/**" },
      { protocol: "https", hostname: process.env.STORAGE_HOSTNAME || "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
