import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { Jimp } = require('jimp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const srcImage = 'C:/Users/Arthur/.gemini/antigravity/brain/8d7a6fea-744c-4a7e-91d9-2100309cc4ca/coteai_icon_1778605579063.png';
const iconsDir = join(projectRoot, 'public', 'icons');
const publicDir = join(projectRoot, 'public');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('Loading source image...');
  const img = await Jimp.read(srcImage);

  for (const size of sizes) {
    const resized = img.clone().resize({ w: size, h: size });
    const outPath = join(iconsDir, `icon-${size}x${size}.png`);
    await resized.write(outPath);
    console.log(`✅ icon-${size}x${size}.png`);
  }

  // Apple touch icon 180x180
  const apple = img.clone().resize({ w: 180, h: 180 });
  await apple.write(join(iconsDir, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png');

  // Favicon 32x32
  const fav = img.clone().resize({ w: 32, h: 32 });
  await fav.write(join(publicDir, 'favicon.png'));
  console.log('✅ favicon.png (public/)');

  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
