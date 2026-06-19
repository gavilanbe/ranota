// ═══════════════════════════════════════════════════════════════
// TUNABLE PARAMETERS — tweak these to adjust game feel
// ═══════════════════════════════════════════════════════════════

export const CONFIG = {
  // ─── World ──────────────────────────────────────────────────
  CHUNK_SIZE: 16,
  WORLD_CHUNKS_X: 5,
  WORLD_CHUNKS_Z: 5,
  TERRAIN_HEIGHT: 7,
  TERRAIN_AMPLITUDE: 5,
  TERRAIN_SCALE: 0.035,

  // ─── Player ─────────────────────────────────────────────────
  PLAYER_SPEED: 8,
  PLAYER_JUMP_FORCE: 11,
  PLAYER_GRAVITY: -28,
  CAMERA_DISTANCE: 12,
  CAMERA_HEIGHT_OFFSET: 5,
  CAMERA_SMOOTH: 0.07,
  MOUSE_SENSITIVITY: 0.003,

  // ─── Tongue (Targeted — LMB) ───────────────────────────────
  TONGUE_SPEED: 50,           // units/s extension speed
  TONGUE_MAX_RANGE: 18,       // max reach
  TONGUE_RETRACT_SPEED: 60,   // units/s retraction
  TONGUE_DRAG_TIME: 0.28,     // seconds to drag fly to mouth
  TONGUE_RADIUS: 0.06,        // mesh thickness
  TONGUE_HIT_TOLERANCE: 1.2,  // how close ray must be to fly

  // ─── Tongue (Spiral AoE — E / RMB) ─────────────────────────
  SPIRAL_DURATION: 2.2,
  SPIRAL_MIN_RADIUS: 0.5,
  SPIRAL_MAX_RADIUS: 4.5,
  SPIRAL_ROTATIONS: 5,
  SPIRAL_COOLDOWN: 4.5,
  SPIRAL_TONGUE_RADIUS: 0.045,
  SPIRAL_PATH_POINTS: 80,     // fixed point count for tube update

  // ─── Flies ──────────────────────────────────────────────────
  FLY_COUNT: 25,
  FLY_SPEED: 2.5,
  FLY_WANDER_RADIUS: 22,
  FLY_WANDER_INTERVAL: 2.0,
  FLY_AVOIDANCE_DIST: 5,
  FLY_AVOIDANCE_STRENGTH: 6,
  FLY_SPAWN_RADIUS: 25,
  FLY_HEIGHT_MIN: 1.5,
  FLY_HEIGHT_MAX: 9,
  FLY_BOB_SPEED: 4,
  FLY_BOB_AMP: 0.25,
  FLY_SIZE: 0.18,
  FLY_WING_SIZE: 0.22,
  FLY_RESPAWN_TIME: 3,

  // ─── VFX ────────────────────────────────────────────────────
  BLOOM_WEIGHT: 0.3,
  BLOOM_THRESHOLD: 0.8,
  BLOOM_KERNEL: 64,
  FOG_DENSITY: 0.012,
  FOG_COLOR: [0.68, 0.78, 0.92],
  SKY_COLOR: [0.58, 0.74, 0.95],
  SCREEN_SHAKE_INTENSITY: 0.12,
  SCREEN_SHAKE_DURATION: 0.15,
  PARTICLE_DENSITY: 25,
  SSAO_ENABLED: true,
  SSAO_RADIUS: 2.0,
  SSAO_SAMPLES: 16,
  FXAA_ENABLED: true,
  TONEMAP_EXPOSURE: 1.4,

  // ─── Audio ──────────────────────────────────────────────────
  MASTER_VOLUME: 0.6,
  SFX_VOLUME: 0.7,
  SLURP_PITCH_MIN: 0.8,
  SLURP_PITCH_MAX: 1.3,

  // ─── UI ─────────────────────────────────────────────────────
  RETICLE_SIZE: 24,
  RETICLE_NORMAL: '#ffffffcc',
  RETICLE_TARGET: '#ff4444ff',
  COOLDOWN_WIDTH: 180,
  COOLDOWN_HEIGHT: 6,

  // ─── Blocks ─────────────────────────────────────────────────
  BLOCK: { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, FLOWER_R: 6, FLOWER_Y: 7 },

  BLOCK_COLORS: {
    1: { top: [0.35, 0.75, 0.22], side: [0.52, 0.38, 0.22], bottom: [0.48, 0.35, 0.20] },
    2: { all: [0.52, 0.38, 0.22] },
    3: { all: [0.58, 0.56, 0.54] },
    4: { all: [0.92, 0.84, 0.56] },
    5: { all: [0.30, 0.55, 0.88] },
    6: { all: [0.95, 0.22, 0.22] },
    7: { all: [0.98, 0.90, 0.22] },
  },
};

// ─── Easing helpers ───────────────────────────────────────────
export const Ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * 2.094) + 1,
};

export function lerp(a, b, t) { return a + (b - a) * t; }
export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
