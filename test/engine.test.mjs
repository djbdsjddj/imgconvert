// Unit test for the shared fit-to-size search. Run: node test/engine.test.mjs
import assert from 'node:assert/strict';
import { fitToSize, toBytes } from '../src/assets/engine.js';

// Fake encoder: bytes grow with pixel area and quality, like JPEG roughly does.
const fake = (base) => async (scale, q) => ({ size: Math.round(base * scale * scale * (0.1 + q)) });

// 1. Fits by quality alone, and picks a high quality (not just any that fits).
let r = await fitToSize(fake(1_000_000), 500_000);
assert.ok(r.fits && r.blob.size <= 500_000 && r.scale === 1);
assert.ok(r.blob.size > 450_000, 'should land close to target, got ' + r.blob.size);

// 2. Already small: returns max quality on the first try.
r = await fitToSize(fake(10_000), 500_000);
assert.equal(r.quality, 0.95);

// 3. Needs downscaling: lowest quality is 150 KB, target 20 KB.
r = await fitToSize(fake(1_000_000), 20_000);
assert.ok(r.fits && r.blob.size <= 20_000 && r.scale < 1, JSON.stringify(r));

// 4. Impossible target reports fits:false instead of looping forever.
r = await fitToSize(async () => ({ size: 999 }), 10);
assert.equal(r.fits, false);

assert.equal(toBytes('20', 'KB'), 20480);
assert.equal(toBytes('1', 'MB'), 1048576);
assert.equal(toBytes('-1', 'KB'), 0);
console.log('engine.test: all passed');
