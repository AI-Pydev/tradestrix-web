declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PwaOptions = {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    runtimeCaching?: unknown;
  };

  export default function withPWAInit(
    options: PwaOptions,
  ): (config: NextConfig) => NextConfig;
}

declare module "next-pwa/cache.js" {
  const runtimeCaching: unknown;
  export default runtimeCaching;
}
