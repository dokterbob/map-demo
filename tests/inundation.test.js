import test from 'node:test';
import assert from 'node:assert/strict';
import { connectedInundation } from '../src/inundation.js';

test('no water below or exactly at the source elevation', () => {
  for (const level of [4, 5]) {
    const result = connectedInundation(Array(9).fill(5), 3, 10, 4, level);
    assert.equal(result.area, 0);
    assert.equal(result.positions.length, 0);
    assert.equal(result.maxDepth, 0);
  }
});

test('a ridge isolates another basin until the water overtops it', () => {
  const n = 5, h = Array.from({ length: 25 }, (_, i) => i % n === 2 ? 10 : 0);
  const below = connectedInundation(h, n, 10, 6, 5);
  assert.equal(below.wet[8], 0);
  assert.equal(below.maxDepth, 5);
  // 40 m along the basin, 15 m to the interpolated shoreline.
  assert.equal(below.area, 600);
  const above = connectedInundation(h, n, 10, 6, 11);
  assert.equal(above.wet[8], 1);
  assert.equal(above.area, 1600);
  assert.equal(above.maxDepth, 11);
  assert.ok(above.reachesBoundary);
});

test('a contained pit stays inside the study area and grows monotonically', () => {
  const h = Array(25).fill(10); h[12] = 0;
  let previous = 0;
  for (const level of [1, 3, 7, 9]) {
    const result = connectedInundation(h, 5, 10, 12, level);
    assert.equal(result.reachesBoundary, false);
    assert.ok(result.area > previous);
    assert.equal(result.maxDepth, level);
    assert.ok(result.positions.every(Number.isFinite));
    for (let j = 1; j < result.positions.length; j += 3) assert.equal(result.positions[j], level);
    previous = result.area;
  }
});

test('connectivity does not cross a ridge along a missing mesh diagonal', () => {
  const separated = connectedInundation([0, 10, 10, 0], 2, 10, 0, 5);
  assert.equal(separated.wet[3], 0);
  const connected = connectedInundation([10, 0, 0, 10], 2, 10, 1, 5);
  assert.equal(connected.wet[2], 1);
});
