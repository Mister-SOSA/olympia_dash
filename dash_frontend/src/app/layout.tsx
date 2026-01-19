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

        {/* iOS Splash Screens */}
        {/* iPhone SE, iPod touch */}
        <link rel="apple-touch-startup-image" href="/splash/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPhone 8, 7, 6s, 6 */}
        <link rel="apple-touch-startup-image" href="/splash/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1242x2208.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone X, XS, 11 Pro */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone XR, 11 */}
        <link rel="apple-touch-startup-image" href="/splash/splash-828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        {/* iPhone XS Max, 11 Pro Max */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 12 mini, 13 mini */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1080x2340.png" media="(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 12, 12 Pro, 13, 13 Pro, 14 */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1170x2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 12 Pro Max, 13 Pro Max, 14 Plus */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1284x2778.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 14 Pro */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1179x2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 14 Pro Max, 15 Plus, 15 Pro Max */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1290x2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPhone 15, 15 Pro */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1179x2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        {/* iPad mini, Air (portrait) */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPad mini, Air (landscape) */}
        <link rel="apple-touch-startup-image" href="/splash/splash-2048x1536.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" />
        {/* iPad Pro 10.5" (portrait) */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1668x2224.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPad Pro 10.5" (landscape) */}
        <link rel="apple-touch-startup-image" href="/splash/splash-2224x1668.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" />
        {/* iPad Pro 11" (portrait) */}
        <link rel="apple-touch-startup-image" href="/splash/splash-1668x2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPad Pro 11" (landscape) */}
        <link rel="apple-touch-startup-image" href="/splash/splash-2388x1668.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" />
        {/* iPad Pro 12.9" (portrait) */}
        <link rel="apple-touch-startup-image" href="/splash/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPad Pro 12.9" (landscape) */}
        <link rel="apple-touch-startup-image" href="/splash/splash-2732x2048.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" />

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