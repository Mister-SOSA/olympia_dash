# PWA Screenshots

This folder contains screenshots used in the PWA manifest for the app store listing and install prompts.

## Required Screenshots

1. **dashboard-desktop.png** (1920x1080)
   - Wide form factor screenshot for desktop install prompts
   - Should show the main dashboard with widgets

2. **dashboard-mobile.png** (390x844) 
   - Narrow form factor screenshot for mobile install prompts
   - Should show the mobile dashboard view

## How to Capture Screenshots

### Option 1: Browser DevTools
1. Open OlyDash in Chrome
2. Open DevTools (F12)
3. Click the device toolbar icon (or Ctrl+Shift+M)
4. Set dimensions to the required size
5. Take a screenshot (Ctrl+Shift+P → "Capture screenshot")

### Option 2: Using Playwright/Puppeteer
```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Desktop screenshot
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'public/screenshots/dashboard-desktop.png' });
  
  // Mobile screenshot
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'public/screenshots/dashboard-mobile.png' });
  
  await browser.close();
})();
```

## Notes
- Screenshots should show the app in a "clean" state with sample data
- Avoid showing sensitive/real business data
- Use the dark theme for consistency with the app's default appearance
