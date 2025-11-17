#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const sourceIcon = path.join(publicDir, 'OlyDash.png');

// Check if sharp is installed
try {
  require.resolve('sharp');
} catch (e) {
  console.error('❌ Sharp is not installed. Install it with:');
  console.error('   npm install --save-dev sharp');
  console.error('   or');
  console.error('   yarn add -D sharp');
  process.exit(1);
}

// Check if source icon exists
if (!fs.existsSync(sourceIcon)) {
  console.error(`❌ Source icon not found: ${sourceIcon}`);
  process.exit(1);
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-icon-152.png', size: 152 },
  { name: 'apple-icon-167.png', size: 167 },
  { name: 'apple-icon-180.png', size: 180 },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from OlyDash.png...\n');

  for (const { name, size } of sizes) {
    const outputPath = path.join(publicDir, name);
    
    try {
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\n✨ All icons generated successfully!');
  console.log('\n📱 Next steps:');
  console.log('   1. Rebuild your Next.js app');
  console.log('   2. Test on iOS by adding to Home Screen');
  console.log('   3. The icon should now appear correctly!\n');
}

generateIcons().catch(console.error);
