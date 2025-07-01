#!/usr/bin/env node

/**
 * Icon Generation Script for PDF Tools
 * Generates various icon sizes and formats for different platforms
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_SIZES = {
  // macOS
  mac: [16, 32, 128, 256, 512, 1024],
  // Windows
  win: [16, 24, 32, 48, 64, 128, 256],
  // Linux
  linux: [16, 24, 32, 48, 64, 128, 256, 512],
  // PNG for Electron
  png: [16, 24, 32, 48, 64, 128, 256, 512, 1024]
};

const OUTPUT_DIR = path.join(__dirname, '../public/assets/generated');
const SOURCE_ICON = path.join(__dirname, '../public/assets/icon.svg');

async function generateIcons() {
  console.log('🎨 Starting icon generation...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('❌ Source icon not found:', SOURCE_ICON);
    console.log('Please ensure icon.svg exists in public/assets/');
    return;
  }

  try {
    // Generate PNG icons
    console.log('📱 Generating PNG icons...');
    for (const size of ICON_SIZES.png) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
      await sharp(SOURCE_ICON)
        .resize(size, size)
        .png({ quality: 100 })
        .toFile(outputPath);
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    }

    // Generate ICO for Windows (using the largest PNG as base)
    console.log('🪟 Generating ICO for Windows...');
    const icoPath = path.join(OUTPUT_DIR, 'icon.ico');
    await sharp(SOURCE_ICON)
      .resize(256, 256)
      .png()
      .toFile(icoPath);
    console.log('✅ Generated: icon.ico');

    // Generate ICNS for macOS (requires additional tooling in production)
    console.log('🍎 Note: For macOS ICNS, use iconutil or similar tools');

    // Copy main icon files to the assets root
    const mainIcon = path.join(__dirname, '../public/assets/icon.png');
    await sharp(SOURCE_ICON)
      .resize(512, 512)
      .png({ quality: 100 })
      .toFile(mainIcon);
    console.log('✅ Generated: main icon.png');

    console.log('🎉 Icon generation completed successfully!');
    console.log(`📁 Generated icons are in: ${OUTPUT_DIR}`);
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
  }
}

// Additional utility functions
async function generateFavicon() {
  console.log('🌐 Generating favicon...');
  const faviconPath = path.join(__dirname, '../public/assets/favicon.ico');
  
  await sharp(SOURCE_ICON)
    .resize(32, 32)
    .png()
    .toFile(faviconPath);
  
  console.log('✅ Generated: favicon.ico');
}

async function generateAppStoreBadge() {
  console.log('🏪 Generating app store marketing assets...');
  const marketingDir = path.join(OUTPUT_DIR, 'marketing');
  
  if (!fs.existsSync(marketingDir)) {
    fs.mkdirSync(marketingDir, { recursive: true });
  }

  // App Store icon (1024x1024)
  await sharp(SOURCE_ICON)
    .resize(1024, 1024)
    .png({ quality: 100 })
    .toFile(path.join(marketingDir, 'app-store-icon.png'));

  console.log('✅ Generated: marketing assets');
}

// Run the script
if (require.main === module) {
  (async () => {
    await generateIcons();
    await generateFavicon();
    await generateAppStoreBadge();
  })();
}

module.exports = {
  generateIcons,
  generateFavicon,
  generateAppStoreBadge
};
