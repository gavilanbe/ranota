import { CONFIG } from './config.js';

const S = CONFIG.CHUNK_SIZE;

function getBlockColor(blockType, normalAxis, normalSign) {
  const c = CONFIG.BLOCK_COLORS[blockType];
  if (!c) return [1, 0, 1]; // magenta = unknown
  if (c.all) return c.all;
  // Directional (e.g., grass top vs side)
  if (normalAxis === 1 && normalSign > 0) return c.top || c.side || c.all;
  if (normalAxis === 1 && normalSign < 0) return c.bottom || c.side || c.all;
  return c.side || c.all;
}

/**
 * Greedy meshing for a single chunk.
 * @param {Function} getBlock (lx, ly, lz) => blockType (0 = air)
 * @returns {{ positions: Float32Array, normals: Float32Array, colors: Float32Array, indices: Uint32Array }}
 */
export function greedyMesh(getBlock) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let vc = 0; // vertex count

  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    const mask = new Int32Array(S * S);

    for (let sign = -1; sign <= 1; sign += 2) {
      for (let slice = 0; slice <= S; slice++) {
        // Build mask
        let n = 0;
        for (let j = 0; j < S; j++) {
          for (let i = 0; i < S; i++) {
            const posA = [0, 0, 0];
            const posB = [0, 0, 0];
            posA[axis] = slice - 1; posA[u] = i; posA[v] = j;
            posB[axis] = slice;     posB[u] = i; posB[v] = j;

            const blockA = slice > 0 ? getBlock(posA[0], posA[1], posA[2]) : 0;
            const blockB = slice < S ? getBlock(posB[0], posB[1], posB[2]) : 0;

            if (sign > 0) {
              // Positive face: block behind exists, block in front is air
              mask[n] = (blockA > 0 && blockB === 0) ? blockA : 0;
            } else {
              // Negative face: block in front exists, block behind is air
              mask[n] = (blockB > 0 && blockA === 0) ? blockB : 0;
            }
            n++;
          }
        }

        // Greedy merge
        for (let j = 0; j < S; j++) {
          let i = 0;
          while (i < S) {
            const idx = j * S + i;
            const type = mask[idx];
            if (type === 0) { i++; continue; }

            // Width
            let w = 1;
            while (i + w < S && mask[j * S + i + w] === type) w++;

            // Height
            let h = 1;
            let fits = true;
            while (j + h < S && fits) {
              for (let k = 0; k < w; k++) {
                if (mask[(j + h) * S + i + k] !== type) { fits = false; break; }
              }
              if (fits) h++;
            }

            // Build quad
            const origin = [0, 0, 0];
            origin[axis] = slice;
            origin[u] = i;
            origin[v] = j;

            const du = [0, 0, 0]; du[u] = w;
            const dv = [0, 0, 0]; dv[v] = h;

            const nrm = [0, 0, 0]; nrm[axis] = sign;
            const col = getBlockColor(type, axis, sign);

            // 4 vertices: v0, v1(+du), v2(+dv), v3(+du+dv)
            positions.push(
              origin[0], origin[1], origin[2],
              origin[0] + du[0], origin[1] + du[1], origin[2] + du[2],
              origin[0] + dv[0], origin[1] + dv[1], origin[2] + dv[2],
              origin[0] + du[0] + dv[0], origin[1] + du[1] + dv[1], origin[2] + du[2] + dv[2],
            );
            for (let q = 0; q < 4; q++) normals.push(nrm[0], nrm[1], nrm[2]);
            for (let q = 0; q < 4; q++) colors.push(col[0], col[1], col[2], 1);

            // Indices — winding depends on normal sign
            if (sign > 0) {
              indices.push(vc, vc + 2, vc + 1, vc + 1, vc + 2, vc + 3);
            } else {
              indices.push(vc, vc + 1, vc + 2, vc + 1, vc + 3, vc + 2);
            }
            vc += 4;

            // Clear mask
            for (let dj = 0; dj < h; dj++)
              for (let di = 0; di < w; di++)
                mask[(j + dj) * S + i + di] = 0;

            i += w;
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}
