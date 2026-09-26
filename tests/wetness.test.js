import test from 'node:test';
import assert from 'node:assert/strict';
import { topographicWetness } from '../src/wetness.js';

test('wetness increases with contributing area and decreases with slope', () => {
  const n = 5, spacing = 10;
  const plane = Array.from({ length: n * n }, (_, i) => (i % n) * spacing);
  const area = new Float64Array(n * n).fill(1);
  const baseline = topographicWetness(plane, n, spacing, area);
  assert.ok(Math.abs(baseline.index[12] - Math.log(10)) < 1e-12);
  area[12] = 10;
  const moreArea = topographicWetness(plane, n, spacing, area);
  assert.ok(moreArea.index[12] > baseline.index[12]);
  const steeper = topographicWetness(plane.map(h => h * 2), n, spacing, area);
  assert.ok(steeper.index[12] < moreArea.index[12]);
});

test('flat terrain has finite values and a neutral uniform display', () => {
  const result = topographicWetness(Array(25).fill(10), 5, 10, Array(25).fill(1));
  assert.ok(result.index.every(Number.isFinite));
  assert.ok(result.relative.every(value => value === 0.5));
  assert.equal(result.index[12], Math.log(10 / 0.001));
});
