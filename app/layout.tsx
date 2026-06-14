import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

import { AuthProvider } from "@/components/auth-provider";
import { DevServiceWorkerReset } from "@/components/dev-service-worker-reset";
import { PlatformAppShell } from "@/components/platform-app-shell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});


export const metadata: Metadata = {
  title: "TradeStrix Platform",
  description: "Landing page and operator surfaces for the TradeStrix trading platform.",
  manifest: "/manifest.webmanifest",
  applicationName: "TradeStrix",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TradeStrix",
  },
  icons: {
    icon: [
      { url: "/icons/tradestrix-192.svg", type: "image/svg+xml" },
      { url: "/icons/tradestrix-512.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/tradestrix-192.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#081321",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <DevServiceWorkerReset />
        <AuthProvider>
          <PlatformAppShell>{children}</PlatformAppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
