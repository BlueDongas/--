/**
 * 색상별 PNG 아이콘 생성 스크립트
 * Node.js 환경에서 실행
 */

const fs = require('fs');
const path = require('path');

// 색상 정의
const colors = {
  green: {
    start: '#4CAF50',
    end: '#2E7D32'
  },
  yellow: {
    start: '#FFC107',
    end: '#F57F17'
  },
  red: {
    start: '#F44336',
    end: '#C62828'
  },
  gray: {
    start: '#9E9E9E',
    end: '#616161'
  }
};

// SVG 템플릿 (방패 아이콘)
function createShieldSvg(size, colorKey) {
  const color = colors[colorKey];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color.start};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color.end};stop-opacity:1" />
    </linearGradient>
  </defs>
  <path fill="url(#grad)" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
</svg>`;
}

// 저장
const sizes = [16, 48, 128];
const colorKeys = Object.keys(colors);

colorKeys.forEach(colorKey => {
  sizes.forEach(size => {
    const svg = createShieldSvg(size, colorKey);
    const filename = path.join(__dirname, `icon-${colorKey}-${size}.svg`);
    fs.writeFileSync(filename, svg);
    console.log(`Created ${filename}`);
  });
});

// 기본 아이콘도 생성 (기존 호환성)
sizes.forEach(size => {
  const svg = createShieldSvg(size, 'green');
  const filename = path.join(__dirname, `icon${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Created ${filename}`);
});

console.log('\nNote: Convert SVGs to PNGs using an online converter or sharp library');
console.log('Run: node convert-to-png.js');
