/**
 * ═══════════════════════════════════════════════════════════════
 * ARTE QUE VESTE — Export de datos principales del proyecto
 * ═══════════════════════════════════════════════════════════════
 * Genera un JSON único con el catálogo de la tienda (frontend/products.json)
 * consolidado con el seed del backend (backend/seed.json): precio, stock,
 * peso y categoría por producto, más un resumen del catálogo.
 *
 * Uso:
 *   npm run export                    → imprime el JSON en stdout
 *   node scripts/export.mjs --out f.json  → además lo escribe en un archivo
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const outFlag = process.argv.indexOf('--out');
if (outFlag !== -1 && process.argv[outFlag + 1]) {
  const outPath = resolve(process.argv[outFlag + 1]);
  writeFileSync(outPath, JSON.stringify(exportCatalog(), null, 2) + '\n', 'utf8');
  console.log('Export escrito en ' + outPath);
} else {
  process.stdout.write(JSON.stringify(exportCatalog(), null, 2) + '\n');
}
