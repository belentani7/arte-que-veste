'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contact = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'contato.html'), 'utf8');

test('contact page does not collect data without a working submission service', () => {
  assert.doesNotMatch(contact, /<form\b/i);
  assert.doesNotMatch(contact, /<(?:input|textarea|select)\b/i);
  assert.doesNotMatch(contact, /(?:wa\.me\/5579999999999|sendMessage\s*\()/i);
  assert.match(contact, /formulário está indisponível/i);
});

test('contact page does not promise an unverified service level', () => {
  assert.doesNotMatch(contact, /Resposta em até 24h|DM aberto|Resposta em até 2h/i);
  assert.match(contact, /Prazo de resposta não confirmado/);
});

test('contact page retains basic access and motion safeguards', () => {
  assert.match(contact, /<html lang="pt-BR">/);
  assert.match(contact, /<main\b/);
  assert.match(contact, /prefers-reduced-motion/);
  assert.match(contact, /rel="noopener noreferrer"/);
});
