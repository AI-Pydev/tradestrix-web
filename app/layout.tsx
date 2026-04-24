import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

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
  title: "TradeKotakAPI Platform",
  description: "Landing page and operator surfaces for the TradeKotakAPI trading platform.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <PlatformAppShell>{children}</PlatformAppShell>
      </body>
    </html>
  );
}
