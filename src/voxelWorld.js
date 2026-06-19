import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CONFIG } from './config.js';
import { fbm } from './noise.js';
import { greedyMesh } from './meshing.js';

const S = CONFIG.CHUNK_SIZE;
const B = CONFIG.BLOCK;

class Chunk {
  constructor(cx, cz, scene) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(S * S * S);
    this.mesh = null;
    this._generate();
    this._buildMesh(scene);
  }

  getBlock(lx, ly, lz) {
    if (lx < 0 || lx >= S || ly < 0 || ly >= S || lz < 0 || lz >= S) return 0;
    return this.blocks[ly * S * S + lz * S + lx];
  }

  _generate() {
    const wx0 = this.cx * S;
    const wz0 = this.cz * S;
    for (let lz = 0; lz < S; lz++) {
      for (let lx = 0; lx < S; lx++) {
        const wx = wx0 + lx;
        const wz = wz0 + lz;
        const h = Math.floor(CONFIG.TERRAIN_HEIGHT + fbm(wx * CONFIG.TERRAIN_SCALE, wz * CONFIG.TERRAIN_SCALE) * CONFIG.TERRAIN_AMPLITUDE);
        for (let ly = 0; ly < S; ly++) {
          const wy = ly;
          let block = B.AIR;
          if (wy <= h) {
            if (wy === h) block = B.GRASS;
            else if (wy > h - 3) block = B.DIRT;
            else block = B.STONE;
          }
          this.blocks[ly * S * S + lz * S + lx] = block;
        }
      }
    }
    // Scatter flowers on grass using simple hash
    const wx0f = this.cx * S, wz0f = this.cz * S;
    for (let lz = 0; lz < S; lz++) {
      for (let lx = 0; lx < S; lx++) {
        const wx = wx0f + lx, wz = wz0f + lz;
        const h = Math.floor(CONFIG.TERRAIN_HEIGHT + fbm(wx * CONFIG.TERRAIN_SCALE, wz * CONFIG.TERRAIN_SCALE) * CONFIG.TERRAIN_AMPLITUDE);
        if (h + 1 < S && this.getBlock(lx, h, lz) === B.GRASS) {
          // Simple hash for flower placement
          let seed = ((wx * 73856093) ^ (wz * 19349663)) >>> 0;
          seed = ((seed >> 13) ^ seed) >>> 0;
          const r = (seed & 0xff) / 255;
          if (r < 0.02) this.blocks[(h + 1) * S * S + lz * S + lx] = B.FLOWER_R;
          else if (r < 0.04) this.blocks[(h + 1) * S * S + lz * S + lx] = B.FLOWER_Y;
        }
      }
    }
  }

  _buildMesh(scene) {
    const data = greedyMesh((x, y, z) => this.getBlock(x, y, z));
    if (data.indices.length === 0) return;

    const mesh = new Mesh(`chunk_${this.cx}_${this.cz}`, scene);
    const vd = new VertexData();
    vd.positions = data.positions;
    vd.normals = data.normals;
    vd.colors = data.colors;
    vd.indices = data.indices;
    vd.applyToMesh(mesh);

    mesh.position = new Vector3(this.cx * S, 0, this.cz * S);
    mesh.receiveShadows = true;
    mesh.isPickable = true;
    mesh.checkCollisions = false;

    // Shared material with vertex colors
    if (!Chunk._material) {
      const mat = new StandardMaterial('voxelMat', scene);
      mat.diffuseColor = new Color3(1, 1, 1); // let vertex colors show through
      mat.specularColor = new Color3(0.08, 0.08, 0.08);
      mat.roughness = 0.85;
    Chunk._material = mat;
    }
    mesh.material = Chunk._material;
    mesh.hasVertexAlpha = false; // vertex colors are RGB, no transparency

    // Register for shadow casting
    if (scene._shadowGenerator) scene._shadowGenerator.addShadowCaster(mesh);

    this.mesh = mesh;
  }
}
Chunk._material = null;

export function createVoxelWorld(scene) {
  const chunks = [];
  const halfX = Math.floor(CONFIG.WORLD_CHUNKS_X / 2);
  const halfZ = Math.floor(CONFIG.WORLD_CHUNKS_Z / 2);

  for (let cx = -halfX; cx <= halfX; cx++) {
    for (let cz = -halfZ; cz <= halfZ; cz++) {
      chunks.push(new Chunk(cx, cz, scene));
    }
  }

  // Height query: returns world-space ground height at (wx, wz)
  function getHeight(wx, wz) {
    return Math.floor(CONFIG.TERRAIN_HEIGHT + fbm(wx * CONFIG.TERRAIN_SCALE, wz * CONFIG.TERRAIN_SCALE) * CONFIG.TERRAIN_AMPLITUDE) + 1;
  }

  // Block query in world coords
  function getBlockWorld(wx, wy, wz) {
    const cx = Math.floor(wx / S);
    const cz = Math.floor(wz / S);
    const chunk = chunks.find(c => c.cx === cx && c.cz === cz);
    if (!chunk) return 0;
    return chunk.getBlock(((wx % S) + S) % S, wy, ((wz % S) + S) % S);
  }

  return { chunks, getHeight, getBlockWorld };
}
