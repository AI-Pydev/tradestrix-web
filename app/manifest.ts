import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TradeStrix Platform",
    short_name: "TradeStrix",
    description:
      "Operator dashboards, TradingView automation, and broker execution surfaces for TradeStrix.",
    start_url: "/",
    display: "standalone",
    background_color: "#081321",
    theme_color: "#081321",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/tradestrix-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/tradestrix-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
