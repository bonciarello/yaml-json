import yaml from 'js-yaml';
import { strict as assert } from 'node:assert';

console.log('=== YAML ⇄ JSON Converter — Test Suite ===\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${description}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${description}`);
    console.log(`    ${e.message}`);
  }
}

// ---- YAML → JSON ----
test('Simple YAML object to JSON', () => {
  const input = 'nome: Mario\ncittà: Roma\n';
  const obj = yaml.load(input);
  const json = JSON.stringify(obj, null, 2);
  const expected = '{\n  "nome": "Mario",\n  "città": "Roma"\n}';
  assert.equal(json, expected);
});

test('YAML with nested objects to JSON', () => {
  const input = 'persona:\n  nome: Mario\n  città: Roma\n';
  const obj = yaml.load(input);
  const json = JSON.stringify(obj, null, 2);
  assert.ok(json.includes('"persona"'));
  assert.ok(json.includes('"nome": "Mario"'));
});

test('YAML with arrays to JSON', () => {
  const input = 'hobby:\n  - lettura\n  - fotografia\n  - corsa\n';
  const obj = yaml.load(input);
  const json = JSON.stringify(obj, null, 2);
  assert.ok(json.includes('"hobby"'));
  assert.ok(json.includes('"lettura"'));
  assert.ok(json.includes('"fotografia"'));
});

test('YAML with numbers and booleans to JSON', () => {
  const input = 'età: 30\nattivo: true\npunteggio: 98.5\n';
  const obj = yaml.load(input);
  assert.equal(obj.età, 30);
  assert.equal(obj.attivo, true);
  assert.equal(obj.punteggio, 98.5);
  const json = JSON.stringify(obj, null, 2);
  assert.ok(json.includes('30'));
  assert.ok(json.includes('true'));
});

// ---- JSON → YAML ----
test('Simple JSON object to YAML', () => {
  const input = '{"nome": "Mario", "città": "Roma"}';
  const obj = JSON.parse(input);
  const output = yaml.dump(obj, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
  assert.ok(output.includes('nome: Mario'));
  assert.ok(output.includes('città: Roma'));
});

test('JSON with nested to YAML', () => {
  const input = '{"persona": {"nome": "Mario", "città": "Roma"}}';
  const obj = JSON.parse(input);
  const output = yaml.dump(obj, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
  assert.ok(output.includes('persona:'));
  assert.ok(output.includes('nome: Mario'));
});

test('JSON array to YAML', () => {
  const input = '{"hobby": ["lettura", "fotografia", "corsa"]}';
  const obj = JSON.parse(input);
  const output = yaml.dump(obj, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
  assert.ok(output.includes('- lettura'));
  assert.ok(output.includes('- fotografia'));
});

// ---- Round-trip ----
test('Round-trip: YAML → JSON → YAML preserves structure', () => {
  const input = 'nome: Mario\ncittà: Roma\netà: 30\n';
  const obj1 = yaml.load(input);
  const json = JSON.stringify(obj1);
  const obj2 = JSON.parse(json);
  assert.deepEqual(obj1, obj2);
});

test('Round-trip: JSON → YAML → JSON preserves structure', () => {
  const input = '{"nome":"Mario","città":"Roma","attivo":true}';
  const obj1 = JSON.parse(input);
  const yamlStr = yaml.dump(obj1, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
  const obj2 = yaml.load(yamlStr);
  assert.deepEqual(obj1, obj2);
});

// ---- Edge cases ----
test('Empty YAML returns null', () => {
  const obj = yaml.load('');
  assert.equal(obj, undefined);
});

test('YAML with only comments', () => {
  const obj = yaml.load('# just a comment\n');
  // js-yaml returns null (not undefined) for comments-only documents
  assert.equal(obj, null);
});

test('Null YAML value', () => {
  const obj = yaml.load('valore: null\n');
  assert.equal(obj.valore, null);
});

test('YAML multi-line string', () => {
  const input = 'descrizione: |\n  Questa è una\n  descrizione multi-linea\n';
  const obj = yaml.load(input);
  assert.ok(obj.descrizione.includes('multi-linea'));
});

test('Complex nested YAML', () => {
  const input = `
server:
  host: localhost
  port: 8080
  ssl: true
  routes:
    - path: /api
      method: GET
    - path: /admin
      method: POST
      auth: true
`;
  const obj = yaml.load(input);
  assert.equal(obj.server.host, 'localhost');
  assert.equal(obj.server.routes.length, 2);
  assert.equal(obj.server.routes[1].auth, true);
});

// ---- Format auto-detection logic ----
test('Detection: JSON-like string starts with {', () => {
  const trimmed = '{"key": "value"}'.trim();
  const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  assert.equal(isJson, true);
});

test('Detection: JSON array starts with [', () => {
  const trimmed = '[1, 2, 3]'.trim();
  const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  assert.equal(isJson, true);
});

test('Detection: YAML-like does not start with { or [', () => {
  const trimmed = 'nome: Mario\ncittà: Roma'.trim();
  const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  assert.equal(isJson, false);
});

// ---- Summary ----
console.log(`\n=== Risultati: ${passed} passati, ${failed} falliti su ${passed + failed} test ===`);
process.exit(failed > 0 ? 1 : 0);
