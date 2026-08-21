import type { NextConfig } from "next";

const firebaseStorageHost = "firebasestorage.googleapis.com";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: firebaseStorageHost, pathname: "/**" },
      { protocol: "https", hostname: "*.firebasestorage.app", pathname: "/**" },
      { protocol: "https", hostname: "storage.googleapis.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
