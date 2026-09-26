// A terrain-only TWI estimate: ln(specific catchment area / tan(slope)).
// Specific catchment area is approximated as contributing cells × cell width.
export function topographicWetness(heights, n, spacing, accumulation) {
  const index = new Float64Array(heights.length);
  const relative = new Float32Array(heights.length);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const left = Math.max(0, x - 1), right = Math.min(n - 1, x + 1);
      const up = Math.max(0, y - 1), down = Math.min(n - 1, y + 1);
      const dx = (heights[y * n + right] - heights[y * n + left]) / ((right - left) * spacing);
      const dy = (heights[down * n + x] - heights[up * n + x]) / ((down - up) * spacing);
      // Avoid infinite values on flat ground. This floor is a model parameter,
      // not an inferred physical slope (0.001 m/m = 0.1%).
      const slope = Math.max(0.001, Math.hypot(dx, dy));
      index[i] = Math.log(accumulation[i] * spacing / slope);
    }
  }
  const sorted = Float64Array.from(index).sort();
  const low = sorted[Math.floor((sorted.length - 1) * 0.05)];
  const high = sorted[Math.floor((sorted.length - 1) * 0.95)];
  for (let i = 0; i < index.length; i++) {
    relative[i] = high === low ? 0.5 : Math.max(0, Math.min(1, (index[i] - low) / (high - low)));
  }
  return { index, relative, low, high };
}
