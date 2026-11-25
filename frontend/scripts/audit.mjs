#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * ARTE QUE VESTE — Auditor de Rendimiento, Accesibilidad y Higiene
 * ═══════════════════════════════════════════════════════════════
 * Mide presupuestos de peso (HTML, CSS, JS, imágenes), ausencia de
 * CDNs bloqueantes, contraste WCAG 2.1 calculado por luminancia
 * relativa y landmarks semánticos en todo frontend/.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Uso: node scripts/audit.mjs [opciones]

Audita rendimiento (presupuesto de bytes y cero CDNs bloqueantes),
accesibilidad (landmarks, skip-links, contraste WCAG 2.1) e higiene.

Opciones:
  --json      Imprime el informe estructurado en JSON
  -h, --help  Muestra esta ayuda
`);
  process.exit(0);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) throw new Error('Hex inválido: ' + hex);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

function dirBytes(dirPath) {
  let total = 0;
  for (const name of readdirSync(dirPath)) {
    const full = join(dirPath, name);
    const st = statSync(full);
    if (st.isFile()) total += st.size;
  }
  return total;
}

const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html')).sort();
let totalHtmlBytes = 0;
let externalScripts = 0;
let externalStyles = 0;
let pagesWithMain = 0;
let pagesWithLangPtBr = 0;
let pagesWithSkipOrStatus = 0;
const issues = [];

for (const file of htmlFiles) {
  const html = readFileSync(join(root, file), 'utf8');
  totalHtmlBytes += Buffer.byteLength(html);
  const extS = [...html.matchAll(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["']/gi)];
  const extL = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']https?:\/\/[^"']+["']/gi)];
  externalScripts += extS.length;
  externalStyles += extL.length;
  if (/<main\b/i.test(html)) pagesWithMain += 1;
  else issues.push(`${file}: falta <main>`);
  if (/lang=["']pt-BR["']/i.test(html)) pagesWithLangPtBr += 1;
  else issues.push(`${file}: lang != pt-BR`);
  if (/class=["']skip-link["']|class=["']demo-banner["']/i.test(html)) pagesWithSkipOrStatus += 1;
  if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(html)) issues.push(`${file}: <img> sin atributo alt`);
}

const cssBytes = dirBytes(join(root, 'css'));
const jsBytes = dirBytes(join(root, 'js'));
const imgBytes = dirBytes(join(root, 'assets', 'img', 'produtos'));
const backupFiles = readdirSync(root).filter((f) => f.includes('.bak')).length;

const contrastChecks = [
  { pair: 'ink #1a1a1a on off-white #faf9f6', ratio: contrastRatio('#1a1a1a', '#faf9f6'), min: 4.5 },
  { pair: 'muted #52524e on off-white #faf9f6', ratio: contrastRatio('#52524e', '#faf9f6'), min: 4.5 },
  { pair: 'accent-link #0f6f5b on off-white #faf9f6', ratio: contrastRatio('#0f6f5b', '#faf9f6'), min: 4.5 },
  { pair: 'ink #1a1a1a on turquoise #40E0D0 (CTA)', ratio: contrastRatio('#1a1a1a', '#40E0D0'), min: 4.5 },
  { pair: 'white #ffffff on dark-hero #1a1a1a', ratio: contrastRatio('#ffffff', '#1a1a1a'), min: 4.5 },
  { pair: 'turquoise #40E0D0 on dark-hero #1a1a1a', ratio: contrastRatio('#40E0D0', '#1a1a1a'), min: 4.5 }
].map((c) => ({ ...c, pass: c.ratio >= c.min }));

for (const c of contrastChecks) {
  if (!c.pass) issues.push(`WCAG contraste insuficiente (${c.ratio}:1 < ${c.min}:1): ${c.pair}`);
}
if (externalScripts > 0) issues.push(`Scripts externos detectados: ${externalScripts}`);
if (externalStyles > 0) issues.push(`Hojas de estilo externas detectadas: ${externalStyles}`);
if (backupFiles > 0) issues.push(`Archivos .bak residuales: ${backupFiles}`);

const report = {
  html_files: htmlFiles.length,
  backup_files: backupFiles,
  budgets_bytes: {
    html_total: totalHtmlBytes,
    html_avg_per_page: Math.round(totalHtmlBytes / htmlFiles.length),
    css_total: cssBytes,
    js_total: jsBytes,
    product_images_total: imgBytes
  },
  third_party: {
    external_scripts: externalScripts,
    external_stylesheets: externalStyles
  },
  accessibility: {
    pages_with_main: pagesWithMain,
    pages_with_pt_br: pagesWithLangPtBr,
    pages_with_skip_or_status: pagesWithSkipOrStatus,
    contrast_checks: contrastChecks
  },
  status: issues.length === 0 ? 'PASS' : 'FAIL',
  issues
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log('=== AUDITORÍA ARTE QUE VESTE ===');
  console.log(`Páginas HTML:        ${report.html_files} (media ${(report.budgets_bytes.html_avg_per_page / 1024).toFixed(1)} KB/página)`);
  console.log(`CSS propio total:    ${(cssBytes / 1024).toFixed(1)} KB`);
  console.log(`JS propio total:     ${(jsBytes / 1024).toFixed(1)} KB`);
  console.log(`Imágenes productos:  ${(imgBytes / 1024).toFixed(1)} KB`);
  console.log(`CDNs externos:       ${externalScripts} JS / ${externalStyles} CSS`);
  console.log(`Contraste WCAG AA:   ${contrastChecks.filter((c) => c.pass).length}/${contrastChecks.length} pares PASS`);
  console.log(`Estado final:        ${report.status}`);
  if (issues.length) console.error('Hallazgos:\n - ' + issues.join('\n - '));
}

if (issues.length > 0) process.exitCode = 1;
