/**
 * SVG to PNG 변환 스크립트
 * sharp 라이브러리를 사용하여 SVG를 PNG로 변환
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const colors = ['green', 'yellow', 'red', 'gray'];
const __dirname_resolved = __dirname;

async function convertToPng() {
  // 색상별 아이콘 변환
  for (const color of colors) {
    for (const size of sizes) {
      const svgPath = path.join(__dirname_resolved, `icon-${color}-${size}.svg`);
      const pngPath = path.join(__dirname_resolved, `icon-${color}-${size}.png`);

      if (!fs.existsSync(svgPath)) {
        console.error(`SVG file not found: ${svgPath}`);
        continue;
      }

      try {
        await sharp(svgPath)
          .resize(size, size)
          .png()
          .toFile(pngPath);

        console.log(`Created ${pngPath}`);
      } catch (error) {
        console.error(`Failed to convert ${svgPath}:`, error.message);
      }
    }
  }

  // 기본 아이콘 변환 (기존 호환성)
  for (const size of sizes) {
    const svgPath = path.join(__dirname_resolved, `icon${size}.svg`);
    const pngPath = path.join(__dirname_resolved, `icon${size}.png`);

    if (!fs.existsSync(svgPath)) {
      console.error(`SVG file not found: ${svgPath}`);
      continue;
    }

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`Created ${pngPath}`);
    } catch (error) {
      console.error(`Failed to convert ${svgPath}:`, error.message);
    }
  }
}

convertToPng().catch(console.error);
