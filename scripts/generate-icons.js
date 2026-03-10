#!/usr/bin/env node
/**
 * Generates PNG icons for the Encompass Aviation PWA.
 * Uses only Node.js built-ins (zlib + Buffer) — no npm deps required.
 *
 * Icon design:
 *   - Navy background (#0a0f1e)
 *   - Amber airplane silhouette (#f59e0b) centered
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Colours ──────────────────────────────────────────────────────────────────
const BG    = [0x0a, 0x0f, 0x1e, 0xff]; // #0a0f1e  navy
const AMBER = [0xf5, 0x9e, 0x0b, 0xff]; // #f59e0b  amber

// ── PNG helpers ───────────────────────────────────────────────────────────────
function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len     = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body    = Buffer.concat([typeBuf, data]);
  const crcBuf  = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function encodePNG(width, height, pixels /* RGBA flat array */) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 6;  // RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Raw scanlines: filter byte (0) + row data
  const raw = Buffer.alloc((1 + width * 4) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;  // filter none
    for (let x = 0; x < width; x++) {
      const src  = (y * width + x) * 4;
      const dest = y * (width * 4 + 1) + 1 + x * 4;
      raw[dest]     = pixels[src];
      raw[dest + 1] = pixels[src + 1];
      raw[dest + 2] = pixels[src + 2];
      raw[dest + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function createCanvas(w, h) {
  const buf = new Uint8Array(w * h * 4);
  // fill with BG
  for (let i = 0; i < w * h; i++) {
    buf[i * 4]     = BG[0];
    buf[i * 4 + 1] = BG[1];
    buf[i * 4 + 2] = BG[2];
    buf[i * 4 + 3] = BG[3];
  }
  function setPixel(x, y, col) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 4;
    buf[i] = col[0]; buf[i+1] = col[1]; buf[i+2] = col[2]; buf[i+3] = col[3];
  }
  function fillRect(x0, y0, rw, rh, col) {
    for (let dy = 0; dy < rh; dy++)
      for (let dx = 0; dx < rw; dx++)
        setPixel(x0 + dx, y0 + dy, col);
  }
  // Anti-alias circle fill
  function fillCircle(cx, cy, r, col) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (dx*dx + dy*dy <= r*r) setPixel(cx+dx, cy+dy, col);
  }
  // Draw line with thickness
  function line(x0, y0, x1, y1, thick, col) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx*dx + dy*dy);
    const steps = Math.ceil(len * 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + dx*t, py = y0 + dy*t;
      fillCircle(px, py, Math.max(1, thick/2), col);
    }
  }
  return { buf, w, h, setPixel, fillRect, fillCircle, line };
}

// ── Icon drawing ──────────────────────────────────────────────────────────────
function drawIcon(size) {
  const cv = createCanvas(size, size);
  const { buf, w, h, line, fillRect, fillCircle } = cv;

  const cx = w / 2;
  const cy = h / 2;
  const s  = size / 512;  // scale factor relative to 512

  // ── fuselage (horizontal tube) ─────────────────────────────────────────────
  const fuseLen  = 200 * s;
  const fuseH    = 28  * s;
  fillRect(cx - fuseLen/2, cy - fuseH/2, fuseLen, fuseH, [0xf5, 0x9e, 0x0b, 0xff]);

  // ── nose cone ─────────────────────────────────────────────────────────────
  //   tapered triangle to the right
  const noseBase = cx + fuseLen/2;
  const noseLen  = 48 * s;
  for (let dx = 0; dx < noseLen; dx++) {
    const taper = (1 - dx / noseLen) * fuseH / 2;
    const y0 = Math.round(cy - taper);
    const y1 = Math.round(cy + taper);
    for (let py = y0; py <= y1; py++) cv.setPixel(noseBase + dx, py, [0xf5,0x9e,0x0b,0xff]);
  }

  // ── main wings ────────────────────────────────────────────────────────────
  //   swept back from ~1/3 from nose, extending to both sides
  const wingRoot = cx + 20 * s;        // x position where wings attach
  const wingTip  = cx - fuseLen/2 + 20*s; // swept back
  const wingSpan = 130 * s;
  // upper wing  (wingRoot,cy) → (wingTip, cy-wingSpan)
  line(wingRoot, cy - fuseH/2, wingTip, cy - wingSpan, 18*s, [0xf5,0x9e,0x0b,0xff]);
  // lower wing
  line(wingRoot, cy + fuseH/2, wingTip, cy + wingSpan, 18*s, [0xf5,0x9e,0x0b,0xff]);
  // wing trailing edge fill
  line(wingTip, cy - wingSpan, wingTip, cy + wingSpan, 14*s, [0xf5,0x9e,0x0b,0xff]);

  // ── tail fins ─────────────────────────────────────────────────────────────
  const tailX   = cx - fuseLen/2 + 10*s;
  const finSpan = 65 * s;
  line(tailX, cy, tailX - 30*s, cy - finSpan, 14*s, [0xf5,0x9e,0x0b,0xff]);
  line(tailX, cy, tailX - 30*s, cy + finSpan, 14*s, [0xf5,0x9e,0x0b,0xff]);
  line(tailX - 30*s, cy - finSpan, tailX - 30*s, cy + finSpan, 11*s, [0xf5,0x9e,0x0b,0xff]);

  return buf;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const sizes  = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const sz of sizes) {
  const pixels = drawIcon(sz);
  const png    = encodePNG(sz, sz, pixels);
  const dest   = path.join(outDir, `icon-${sz}.png`);
  fs.writeFileSync(dest, png);
  console.log(`✓ icon-${sz}.png  (${png.length} bytes)`);
}
console.log('\nAll icons written to public/icons/');
