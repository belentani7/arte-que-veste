import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const files = readdirSync(root).filter(file => /\.html?$/i.test(file));
const failures = [];
let scriptsChecked = 0;
let linksChecked = 0;

function insideRoot(file) {
  const rel = relative(root, file);
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !rel.startsWith(sep));
}

for (const file of files) {
  const content = readFileSync(join(root, file), 'utf8');
  const scripts = [...content.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    if (/\bsrc\s*=/.test(match[1]) || /\btype\s*=\s*["'](?:application\/ld\+json|application\/json)["']/i.test(match[1])) return;
    try { new vm.Script(match[2], { filename: file + ':script-' + (index + 1) }); scriptsChecked += 1; }
    catch (error) { failures.push(file + ' invalid inline JS: ' + error.message); }
  });
  const elements = [...content.matchAll(/<(?:a|link|script|img|source|iframe|form)\b[^>]*>/gi)];
  for (const element of elements) {
    const attrs = [...element[0].matchAll(/\b(?:href|src|poster|action)\s*=\s*["']([^"']+)["']/gi)];
    for (const [, raw] of attrs) {
      if (/^(?:https?:|\/\/|mailto:|tel:|data:|blob:|javascript:|#)/i.test(raw) || raw.includes('${') || raw.includes('<%')) continue;
      const trimmed = raw.split(/[?#]/)[0];
      if (!trimmed) continue;
      const resolved = resolve(root, trimmed.startsWith('/') ? '.' + trimmed : trimmed);
      linksChecked += 1;
      if (!insideRoot(resolved) || !existsSync(resolved)) failures.push(file + ' missing local target: ' + raw);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: ' + files.length + ' HTML files, ' + scriptsChecked + ' inline scripts and ' + linksChecked + ' local references validated.');
}
