// Ejecuta las pruebas unitarias sin necesidad de Expo.
// Copia src/ a una carpeta temporal como módulos ES (.mjs) y lanza node --test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'turismo-'));
const fix = (code) => code.replace(/from '(\.\.?\/[^']+?)(\.js)?'/g, "from '$1.mjs'");

for (const dir of ['src/services', 'src/utils']) {
  fs.mkdirSync(path.join(tmp, dir), { recursive: true });
  for (const f of fs.readdirSync(path.join(root, dir))) {
    const code = fix(fs.readFileSync(path.join(root, dir, f), 'utf8'));
    fs.writeFileSync(path.join(tmp, dir, f.replace(/\.js$/, '.mjs')), code);
  }
}
fs.mkdirSync(path.join(tmp, 'tests'), { recursive: true });
const tests = fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.test.mjs'));
for (const f of tests) {
  fs.writeFileSync(path.join(tmp, 'tests', f), fix(fs.readFileSync(path.join(root, 'tests', f), 'utf8')));
}
const r = spawnSync(process.execPath, ['--test', ...tests.map((f) => path.join(tmp, 'tests', f))], { stdio: 'inherit' });
process.exit(r.status ?? 1);
