#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * ARTE QUE VESTE — Optimizador y auditor de imágenes de producto
 * ═══════════════════════════════════════════════════════════════
 * Revisa frontend/assets/img/produtos/, detecta duplicados por SHA-256
 * y optimiza imágenes JPEG con ImageMagick (redimensionado progresivo
 * + stripping de metadatos EXIF + alternativa AVIF).
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = join(root, 'assets', 'img', 'produtos');

function printHelp() {
  console.log(`Uso: node scripts/optimize-images.mjs [opciones]

Opciones:
  --check           Solo audita tamaños y duplicados sin modificar archivos
  --max-width <px>  Ancho máximo en píxeles (por defecto: 900)
  --quality <1-100> Calidad JPEG (por defecto: 82)
  --avif            Genera también versión .avif junto a cada JPEG
  -h, --help        Muestra esta ayuda
`);
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function parseArgs(argv) {
  const opts = { check: false, maxWidth: 900, quality: 82, avif: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg === '--check') opts.check = true;
    else if (arg === '--avif') opts.avif = true;
    else if (arg === '--max-width' && argv[i + 1]) { opts.maxWidth = Number(argv[++i]) || 900; }
    else if (arg === '--quality' && argv[i + 1]) { opts.quality = Number(argv[++i]) || 82; }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  printHelp();
  process.exit(0);
}

const files = readdirSync(imgDir).sort();
const hashes = new Map();
const duplicates = [];
let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const fullPath = join(imgDir, file);
  const size = statSync(fullPath).size;
  totalBefore += size;
  const hash = sha256(fullPath);
  if (hashes.has(hash)) {
    duplicates.push([hashes.get(hash), file]);
  } else {
    hashes.set(hash, file);
  }
}

if (opts.check) {
  console.log(`Imágenes en ${imgDir}: ${files.length} archivos (${(totalBefore / 1024).toFixed(1)} KB)`);
  if (duplicates.length) {
    console.error('Duplicados detectados:', duplicates.map(([a, b]) => `${a} == ${b}`).join(', '));
    process.exit(1);
  }
  const oversized = files
    .filter((f) => /\.jpe?g$/i.test(f))
    .map((f) => ({ file: f, size: statSync(join(imgDir, f)).size }))
    .filter((x) => x.size > 200 * 1024);
  if (oversized.length) {
    console.error('Imágenes > 200 KB:', oversized.map((x) => `${x.file} (${(x.size / 1024).toFixed(1)} KB)`).join(', '));
    process.exit(1);
  }
  console.log('PASS: sin duplicados ni imágenes sobredimensionadas.');
  process.exit(0);
}

const hasConvert = spawnSync('convert', ['-version'], { stdio: 'ignore' }).status === 0;
if (!hasConvert) {
  console.error('Error: ImageMagick `convert` no está disponible en PATH.');
  process.exit(1);
}

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const fullPath = join(imgDir, file);
  const before = statSync(fullPath).size;
  if (ext !== '.jpg' && ext !== '.jpeg') {
    totalAfter += before;
    continue;
  }
  const tmpPath = `${fullPath}.opt.jpg`;
  const res = spawnSync(
    'convert',
    [
      fullPath,
      '-auto-orient',
      '-strip',
      '-resize', `${opts.maxWidth}x>`,
      '-interlace', 'Plane',
      '-sampling-factor', '4:2:0',
      '-quality', String(opts.quality),
      tmpPath,
    ],
    { encoding: 'utf8' }
  );
  if (res.status !== 0) {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    console.error(`Falló optimización de ${file}: ${res.stderr}`);
    process.exit(1);
  }
  const after = statSync(tmpPath).size;
  if (after < before) {
    renameSync(tmpPath, fullPath);
    totalAfter += after;
    const savedPct = (((before - after) / before) * 100).toFixed(1);
    console.log(`${file}: ${(before / 1024).toFixed(1)} KB -> ${(after / 1024).toFixed(1)} KB (-${savedPct}%)`);
  } else {
    unlinkSync(tmpPath);
    totalAfter += before;
    console.log(`${file}: ya optimizada (${(before / 1024).toFixed(1)} KB)`);
  }

  if (opts.avif) {
    const avifPath = join(imgDir, `${basename(file, ext)}.avif`);
    const avifRes = spawnSync('convert', [fullPath, '-quality', '60', avifPath], { encoding: 'utf8' });
    if (avifRes.status === 0 && existsSync(avifPath)) {
      const avifSize = statSync(avifPath).size;
      console.log(`  -> ${basename(avifPath)}: ${(avifSize / 1024).toFixed(1)} KB`);
    }
  }
}

console.log(`Total: ${(totalBefore / 1024).toFixed(1)} KB -> ${(totalAfter / 1024).toFixed(1)} KB`);
