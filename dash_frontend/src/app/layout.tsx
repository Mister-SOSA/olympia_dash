import "../styles/globals.css";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { ToasterProvider } from "@/components/ToasterProvider";
import { SnowOverlay } from "@/components/SnowOverlay";
import { Viewport } from "next";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Specify weights
  display: "swap", // Optimizes font loading
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  title: "OlyDash",
  description: "A customizable business intelligence dashboard with real-time widgets, preset management, and IoT integrations.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OlyDash",
  },
  icons: {
    icon: [
      { url: "/OlyDash.png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="OlyDash" />

        {/* Apple Touch Icons - iOS requires these specific sizes */}
        <link rel="apple-touch-icon" href="/apple-icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-icon-167.png" />

        {/* Standard favicon */}
        <link rel="icon" href="/OlyDash.png" />

        {/* Web Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme color */}
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>
        <Providers>
          {children}
          <ToasterProvider />
          <SnowOverlay />
        </Providers>
      </body>
    </html>
  );
}