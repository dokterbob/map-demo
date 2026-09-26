// A held, horizontal water level connected to one selected terrain vertex.
// This is a geometric scenario, not a time-dependent or volume-limited flood.
export function connectedInundation(heights, n, spacing, seed, level) {
  const wet = new Uint8Array(heights.length);
  let maxDepth = 0, reachesBoundary = false;
  if (heights[seed] >= level) {
    return { wet, level, maxDepth, reachesBoundary, area: 0, positions: new Float32Array() };
  }

  const queue = new Int32Array(heights.length);
  let head = 0, tail = 1;
  queue[0] = seed;
  wet[seed] = 1;
  // Follow exactly the edges in the terrain triangulation. The NE–SW
  // diagonal is present; the NW–SE diagonal crosses a potential ridge.
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1], [1, -1], [-1, 1]];
  while (head < tail) {
    const i = queue[head++], x = i % n, y = Math.floor(i / n);
    maxDepth = Math.max(maxDepth, level - heights[i]);
    if (x === 0 || y === 0 || x === n - 1 || y === n - 1) reachesBoundary = true;
    for (const [dx, dy] of offsets) {
      if (x + dx < 0 || x + dx >= n || y + dy < 0 || y + dy >= n) continue;
      const j = i + dy * n + dx;
      if (!wet[j] && heights[j] < level) {
        wet[j] = 1;
        queue[tail++] = j;
      }
    }
  }

  // Clip each connected terrain triangle at the water plane. Interpolated
  // shorelines and area follow the rendered surface instead of cell boxes.
  const vertices = [];
  let area = 0;
  const vertex = i => [(i % n - (n - 1) / 2) * spacing, heights[i], (Math.floor(i / n) - (n - 1) / 2) * spacing];
  const clip = ids => {
    if (!ids.some(i => wet[i])) return;
    const input = ids.map(vertex), polygon = [];
    for (let k = 0; k < input.length; k++) {
      const a = input[k], b = input[(k + 1) % input.length];
      if (a[1] < level) polygon.push([a[0], level, a[2]]);
      if ((a[1] < level) !== (b[1] < level)) {
        const t = (level - a[1]) / (b[1] - a[1]);
        polygon.push([a[0] + t * (b[0] - a[0]), level, a[2] + t * (b[2] - a[2])]);
      }
    }
    for (let k = 1; k < polygon.length - 1; k++) {
      const a = polygon[0], b = polygon[k], c = polygon[k + 1];
      area += Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) / 2;
      vertices.push(...a, ...b, ...c);
    }
  };
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const a = y * n + x, b = a + 1, c = a + n, d = c + 1;
      clip([a, c, b]);
      clip([b, c, d]);
    }
  }
  return { wet, level, maxDepth, reachesBoundary, area, positions: new Float32Array(vertices) };
}
