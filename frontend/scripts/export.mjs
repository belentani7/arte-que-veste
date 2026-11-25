#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * ARTE QUE VESTE — Export de datos principales del proyecto
 * ═══════════════════════════════════════════════════════════════
 * Genera un JSON o CSV consolidado con frontend/products.json y
 * backend/seed.json: precio, stock, peso y categoría por producto.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Uso: node scripts/export.mjs [opciones]

Opciones:
  --format <json|csv>  Formato de salida (por defecto: json)
  --out <archivo>      Escribe el resultado en disco en lugar de stdout
  -h, --help           Muestra esta ayuda
`);
  process.exit(0);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(root, '..');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function exportCatalog() {
  const catalogo = readJson(join(root, 'products.json'));
  let seed = [];
  try {
    seed = readJson(join(repoRoot, 'backend', 'seed.json'));
  } catch {
    // El seed es opcional: la tienda sirve frontend/products.json
  }
  const seedPorSku = new Map(seed.map((p) => [p.sku, p]));

  const products = catalogo.map((p) => {
    const s = seedPorSku.get(p.sku) || {};
    return {
      sku: p.sku,
      name: p.name,
      desc: p.desc || s.desc || '',
      price: p.price,
      category: p.category,
      stock: typeof p.stock === 'number' ? p.stock : (s.stock ?? null),
      img: p.img,
      weight_kg: s.weight_kg ?? null,
    };
  });

  const porCategoria = {};
  for (const p of products) {
    porCategoria[p.category] = (porCategoria[p.category] || 0) + 1;
  }

  return {
    project: 'arte-que-veste',
    exported_at: new Date().toISOString(),
    sources: ['frontend/products.json', 'backend/seed.json'],
    total_products: products.length,
    categories: porCategoria,
    price_range: products.length
      ? { min: Math.min(...products.map((p) => p.price)), max: Math.max(...products.map((p) => p.price)) }
      : null,
    products,
  };
}

function toCsv(catalog) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['sku', 'name', 'desc', 'price', 'category', 'stock', 'img', 'weight_kg'].join(';');
  const rows = catalog.products.map((p) =>
    [p.sku, p.name, p.desc, p.price.toFixed(2), p.category, p.stock ?? '', p.img, p.weight_kg ?? ''].map(esc).join(';')
  );
  return [header, ...rows].join('\n') + '\n';
}

const fmtIdx = process.argv.indexOf('--format');
const format = fmtIdx !== -1 && process.argv[fmtIdx + 1] ? process.argv[fmtIdx + 1].toLowerCase() : 'json';
const data = exportCatalog();
const output = format === 'csv' ? toCsv(data) : JSON.stringify(data, null, 2) + '\n';

const outFlag = process.argv.indexOf('--out');
if (outFlag !== -1 && process.argv[outFlag + 1]) {
  const outPath = resolve(process.argv[outFlag + 1]);
  writeFileSync(outPath, output, 'utf8');
  console.log('Export (' + format + ') escrito en ' + outPath);
} else {
  process.stdout.write(output);
}
