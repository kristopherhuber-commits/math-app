// R-NF-2: the gzipped JavaScript of the production build stays within 1 MB (fonts and illustrations
// excluded). Run after `vite build`; exits non-zero when over budget, so `npm run build` and CI fail.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = 1024 * 1024;
const dir = join('dist', 'assets');
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
const total = files.reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`R-NF-2: ${files.length} JS files, ${kb(total)} gzipped (budget ${kb(BUDGET)})`);
if (total > BUDGET) {
  console.error('R-NF-2: over the bundle budget');
  process.exit(1);
}
