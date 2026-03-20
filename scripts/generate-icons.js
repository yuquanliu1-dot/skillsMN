/**
 * Icon Generator Script
 *
 * Generates app icons for all platforms from the SVG source.
 * Requires: npm install sharp --save-dev
 *
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  sharp module not found. Please install it first:');
  console.log('   npm install sharp --save-dev');
  console.log('\nAlternatively, you can:');
  console.log('1. Open resources/icons/preview.html in a browser');
  console.log('2. Use an online SVG to PNG converter');
  console.log('3. Use a design tool like Figma or Inkscape');
  process.exit(1);
}

const ICONS_DIR = path.join(__dirname, '../resources/icons');
const SVG_PATH = path.join(ICONS_DIR, 'icon.svg');

// Icon sizes for different platforms
const SIZES = {
  // Windows
  ico: [16, 24, 32, 48, 64, 128, 256],
  // macOS
  icns: [16, 32, 64, 128, 256, 512, 1024],
  // Linux and general use
  png: [16, 32, 48, 64, 128, 256, 512]
};

async function generatePNG(size, outputPath) {
  const svgBuffer = fs.readFileSync(SVG_PATH);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`✓ Generated: ${outputPath}`);
}

async function generateIcons() {
  console.log('🎨 Generating app icons...\n');

  // Ensure output directories exist
  const dirs = [ICONS_DIR];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Generate PNG files
  console.log('📱 Generating PNG icons...');
  for (const size of SIZES.png) {
    await generatePNG(size, path.join(ICONS_DIR, `icon-${size}x${size}.png`));
  }

  // Generate main icon.png (512x512)
  await generatePNG(512, path.join(ICONS_DIR, 'icon.png'));
  console.log('✓ Generated: icon.png (512x512)\n');

  console.log('🎉 Icon generation complete!\n');
  console.log('Next steps:');
  console.log('1. For Windows: Use an online tool to convert PNG to ICO');
  console.log('   Recommended: https://convertio.co/png-ico/');
  console.log('2. For macOS: Use iconutil or online tool to convert to ICNS');
  console.log('   Recommended: https://cloudconvert.com/png-to-icns');
  console.log('3. Place the final icons in resources/icons/ folder');
}

generateIcons().catch(console.error);
