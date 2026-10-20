import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(path.join(root, 'design-system/manifest.json'), 'utf8'));
for (const [file, expected] of Object.entries(manifest.files)) {
  const actual = createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex');
  if (actual !== expected) throw new Error(`${file} differs from foundation ${manifest.version}. Update the canonical Sure Imports source and sync all consumers.`);
}
const layout = readFileSync(path.join(root, 'app/layout.tsx'), 'utf8');
for (const required of ['data-si-foundation="1"', '../design-system/tokens.css', '../design-system/components.css']) {
  if (!layout.includes(required)) throw new Error(`Root layout is missing ${required}`);
}
console.log(`Sure Imports foundation ${manifest.version}: files and root integration verified.`);
