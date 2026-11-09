import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create crisp vector icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="androidGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3DDC84" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#3DDC84" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bg)" />
  <rect x="24" y="24" width="464" height="464" rx="104" fill="none" stroke="#3DDC84" stroke-opacity="0.15" stroke-width="4" />
  
  <g transform="translate(106, 126)" filter="url(#glow)">
    <!-- Android Head -->
    <path d="M 30,120 A 120,120 0 0,1 270,120 Z" fill="url(#androidGrad)" />
    <!-- Antennas -->
    <line x1="75" y1="45" x2="45" y2="15" stroke="#3DDC84" stroke-width="14" stroke-linecap="round" />
    <line x1="225" y1="45" x2="255" y2="15" stroke="#3DDC84" stroke-width="14" stroke-linecap="round" />
    <!-- Eyes -->
    <circle cx="95" cy="85" r="14" fill="#0f172a" />
    <circle cx="205" cy="85" r="14" fill="#0f172a" />
    
    <!-- Body -->
    <rect x="30" y="136" width="240" height="150" rx="28" fill="url(#androidGrad)" />
    <!-- Left Arm -->
    <rect x="-24" y="136" width="38" height="110" rx="19" fill="url(#androidGrad)" />
    <!-- Right Arm -->
    <rect x="286" y="136" width="38" height="110" rx="19" fill="url(#androidGrad)" />
    <!-- Left Leg -->
    <rect x="75" y="296" width="42" height="85" rx="21" fill="url(#androidGrad)" />
    <!-- Right Leg -->
    <rect x="183" y="296" width="42" height="85" rx="21" fill="url(#androidGrad)" />
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// Function to generate raw PNG file without external dependencies
function createPng(width, height, isMaskable = false) {
  // Simple uncompressed/raw deflated PNG
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.45 : width * 0.42;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color #0f172a
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      // Inside Android circle icon area
      if (dist < radius) {
        // Android Green gradient #3ddc84
        const factor = Math.min(1, Math.max(0, (y / height)));
        r = Math.round(61 * (1 - factor * 0.3));
        g = Math.round(220 * (1 - factor * 0.15));
        b = Math.round(132 * (1 - factor * 0.2));
        
        // Android Eye dots (approximate center positioning)
        const eyeY = cy - radius * 0.2;
        const leftEyeX = cx - radius * 0.35;
        const rightEyeX = cx + radius * 0.35;
        const eyeDist1 = Math.hypot(x - leftEyeX, y - eyeY);
        const eyeDist2 = Math.hypot(x - rightEyeX, y - eyeY);
        if (eyeDist1 < radius * 0.1 || eyeDist2 < radius * 0.1) {
          r = 15;
          g = 23;
          b = 42;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeInt32BE(crc, 0);

    return Buffer.concat([len, typeAndData, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = chunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = chunk('IDAT', deflated);

  // IEND
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation for PNG chunks
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(32, 32, false));

console.log('Successfully generated PWA and mobile Android icons!');
