import "bootstrap/dist/css/bootstrap.min.css";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/components/auth-provider";
import { DevServiceWorkerReset } from "@/components/dev-service-worker-reset";
import { PlatformAppShell } from "@/components/platform-app-shell";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} selection:bg-emerald-500 selection:text-slate-950`}>
        <DevServiceWorkerReset />
        <AuthProvider>
          <PlatformAppShell>{children}</PlatformAppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
