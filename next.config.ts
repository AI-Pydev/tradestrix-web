import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import runtimeCaching from "next-pwa/cache.js";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next.js 16 uses Turbopack by default for `next dev`. `next-pwa` injects a
  // webpack config even when disabled in development, which triggers a startup
  // error unless Turbopack is explicitly configured.
  turbopack: {},
};

export default withPWA(nextConfig);
