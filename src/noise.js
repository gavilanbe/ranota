// Simple value noise for terrain generation (no dependencies)

function hash(x, y) {
  let n = (x * 73856093) ^ (y * 19349663);
  n = ((n >> 13) ^ n) >>> 0;
  n = (n * (n * n * 60493 + 19990303) + 1376312589) >>> 0;
  return (n & 0x7fffffff) / 0x7fffffff;
}

function smooth(t) { return t * t * (3 - 2 * t); }

function noise2D(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export function fbm(x, y, octaves = 4, lacunarity = 2.0, persistence = 0.5) {
  let value = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * freq, y * freq) * amp;
    max += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return value / max;
}
