/**
 * Erzeugt die PWA-Icons dependency-frei (nur Node-Bordmittel: zlib).
 * Motiv: ein kleiner "Planer"-Kalender (weisse Seite, farbiger Kopf,
 * Punkteraster mit einem hervorgehobenen Tag).
 *
 * Aufruf:  npm run icons
 */
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'icons');

// Farben (RGBA)
const MARKE = [79, 70, 229, 255];       // #4f46e5
const MARKE_DUNKEL = [67, 56, 202, 255]; // #4338ca
const WEISS = [255, 255, 255, 255];
const RASTER = [199, 210, 254, 255];     // helles Indigo
const TRANSPARENT = [0, 0, 0, 0];

// --- winziger PNG-Encoder ---------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function pngEncode(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // Filter "none"
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- Zeichenfläche ----------------------------------------------------------
function neueFlaeche(n) {
  return { n, buf: Buffer.alloc(n * n * 4) };
}
function px(f, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= f.n || y >= f.n) return;
  const i = (y * f.n + x) * 4;
  // Alpha-Blending auf bestehenden Pixel
  const ba = f.buf[i + 3] / 255;
  const fa = a / 255;
  const outA = fa + ba * (1 - fa);
  if (outA === 0) { f.buf[i] = f.buf[i + 1] = f.buf[i + 2] = f.buf[i + 3] = 0; return; }
  f.buf[i] = Math.round((r * fa + f.buf[i] * ba * (1 - fa)) / outA);
  f.buf[i + 1] = Math.round((g * fa + f.buf[i + 1] * ba * (1 - fa)) / outA);
  f.buf[i + 2] = Math.round((b * fa + f.buf[i + 2] * ba * (1 - fa)) / outA);
  f.buf[i + 3] = Math.round(outA * 255);
}
function rechteck(f, x0, y0, w, h, farbe) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(f, x, y, farbe);
}
function rundRechteck(f, x0, y0, w, h, r, farbe) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = x < x0 + r ? x0 + r - x : x >= x0 + w - r ? x - (x0 + w - r - 1) : 0;
      const dy = y < y0 + r ? y0 + r - y : y >= y0 + h - r ? y - (y0 + h - r - 1) : 0;
      if (dx * dx + dy * dy <= r * r) px(f, x, y, farbe);
    }
  }
}

/** Zeichnet das Kalender-Motiv, skaliert auf die Flaeche n mit Innenrand pad. */
function motiv(f, pad) {
  const n = f.n;
  const seite = n - 2 * pad;
  const x0 = pad;
  const y0 = pad + Math.round(seite * 0.06);
  const w = seite;
  const h = Math.round(seite * 0.82);
  const r = Math.round(seite * 0.1);

  // Binder-Laschen
  const laschenB = Math.round(seite * 0.09);
  rundRechteck(f, x0 + Math.round(seite * 0.24), y0 - Math.round(seite * 0.05), laschenB, Math.round(seite * 0.12), Math.round(laschenB / 3), MARKE_DUNKEL);
  rundRechteck(f, x0 + Math.round(seite * 0.67), y0 - Math.round(seite * 0.05), laschenB, Math.round(seite * 0.12), Math.round(laschenB / 3), MARKE_DUNKEL);

  // Seite (weiss) + Kopfband
  rundRechteck(f, x0, y0, w, h, r, WEISS);
  const kopf = Math.round(h * 0.26);
  // Kopfband oben mit runden oberen Ecken
  for (let y = y0; y < y0 + kopf; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = x < x0 + r ? x0 + r - x : x >= x0 + w - r ? x - (x0 + w - r - 1) : 0;
      const dy = y < y0 + r ? y0 + r - y : 0;
      if (dx * dx + dy * dy <= r * r) px(f, x, y, MARKE);
    }
  }

  // Punkteraster 3x3, Mitte hervorgehoben
  const gx = x0 + Math.round(w * 0.16);
  const gy = y0 + kopf + Math.round(h * 0.14);
  const feld = Math.round(w * 0.68);
  const zelle = Math.round(feld / 3);
  const punkt = Math.round(zelle * 0.5);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = gx + col * zelle + Math.round((zelle - punkt) / 2);
      const cy = gy + row * zelle + Math.round((zelle - punkt) / 2);
      const farbe = row === 1 && col === 1 ? MARKE : RASTER;
      rundRechteck(f, cx, cy, punkt, punkt, Math.round(punkt / 3), farbe);
    }
  }
}

function schreibe(name, buf) {
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('  ✓', name, `(${buf.length} B)`);
}

function erzeugeRund(n) {
  const f = neueFlaeche(n);
  // abgerundeter Marke-Hintergrund auf transparent
  rundRechteck(f, 0, 0, n, n, Math.round(n * 0.22), MARKE);
  motiv(f, Math.round(n * 0.2));
  return pngEncode(n, n, f.buf);
}
function erzeugeMaskable(n) {
  const f = neueFlaeche(n);
  rechteck(f, 0, 0, n, n, MARKE); // vollflaechig (Safe-Zone-tauglich)
  motiv(f, Math.round(n * 0.26));
  return pngEncode(n, n, f.buf);
}

fs.mkdirSync(OUT, { recursive: true });
console.log('Erzeuge Icons in', OUT);
schreibe('icon-192.png', erzeugeRund(192));
schreibe('icon-512.png', erzeugeRund(512));
schreibe('maskable-512.png', erzeugeMaskable(512));
schreibe('apple-touch-icon.png', erzeugeMaskable(180));
schreibe('icon-32.png', erzeugeMaskable(32));
console.log('Fertig.');
