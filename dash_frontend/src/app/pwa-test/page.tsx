"use client";

import { useEffect, useState } from "react";

export default function PWATest() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      logicalWidth: window.screen.width / window.devicePixelRatio,
      logicalHeight: window.screen.height / window.devicePixelRatio,
      standalone: (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches,
      orientation: window.screen.orientation?.type || "unknown",
      expectedSplash: `splash-${window.screen.width}x${window.screen.height}.png`,
      mediaQuery: `(device-width: ${window.screen.width / window.devicePixelRatio}px) and (device-height: ${window.screen.height / window.devicePixelRatio}px) and (-webkit-device-pixel-ratio: ${window.devicePixelRatio})`,
    };
    setDeviceInfo(info);
  }, []);

  if (!deviceInfo) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">PWA Splash Screen Debug</h1>
      
      <div className="space-y-2 font-mono text-sm">
        <div className="bg-slate-800 p-3 rounded">
          <strong>User Agent:</strong>
          <div className="text-xs text-slate-300 mt-1 break-all">{deviceInfo.userAgent}</div>
        </div>

        <div className="bg-slate-800 p-3 rounded">
          <strong>Screen Dimensions:</strong>
          <div className="text-xs text-slate-300 mt-1">
            Physical: {deviceInfo.screenWidth} × {deviceInfo.screenHeight}px<br/>
            Logical: {deviceInfo.logicalWidth} × {deviceInfo.logicalHeight}px<br/>
            Viewport: {deviceInfo.innerWidth} × {deviceInfo.innerHeight}px<br/>
            Pixel Ratio: {deviceInfo.devicePixelRatio}x
          </div>
        </div>

        <div className="bg-slate-800 p-3 rounded">
          <strong>PWA Mode:</strong>
          <div className="text-xs text-slate-300 mt-1">
            Standalone: {deviceInfo.standalone ? "✅ YES" : "❌ NO (must add to home screen)"}
          </div>
        </div>

        <div className="bg-slate-800 p-3 rounded">
          <strong>Expected Splash Screen:</strong>
          <div className="text-xs text-slate-300 mt-1">{deviceInfo.expectedSplash}</div>
        </div>

        <div className="bg-slate-800 p-3 rounded">
          <strong>Media Query Match:</strong>
          <div className="text-xs text-slate-300 mt-1 break-all">{deviceInfo.mediaQuery}</div>
        </div>

        <div className="bg-slate-800 p-3 rounded">
          <strong>iPhone 16 Pro Max Expected:</strong>
          <div className="text-xs text-slate-300 mt-1">
            Logical: 440 × 956px<br/>
            Physical: 1320 × 2868px<br/>
            Pixel Ratio: 3x<br/>
            Splash: splash-1320x2868.png
          </div>
        </div>

        {deviceInfo.logicalWidth === 440 && deviceInfo.logicalHeight === 956 && (
          <div className="bg-green-900 p-3 rounded border border-green-500">
            <strong>✅ iPhone 16 Pro Max Detected!</strong>
            <div className="text-xs text-green-300 mt-1">
              Your device matches the iPhone 16 Pro Max specs.
            </div>
          </div>
        )}

        <div className="bg-amber-900 p-3 rounded border border-amber-500 mt-4">
          <strong>⚠️ Testing Instructions:</strong>
          <div className="text-xs text-amber-200 mt-2 space-y-1">
            1. If "Standalone" shows NO, tap Share → Add to Home Screen<br/>
            2. Delete any existing OlyDash PWA from home screen first<br/>
            3. After adding to home screen, launch from the icon (not Safari)<br/>
            4. The splash screen only appears during PWA launch, not in browser<br/>
            5. Check if the expected splash matches what's configured
          </div>
        </div>
      </div>
    </div>
  );
}
