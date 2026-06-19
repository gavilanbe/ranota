import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateTube } from '@babylonjs/core/Meshes/Builders/tubeBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CONFIG, Ease, lerp, clamp } from './config.js';

// ── Tongue material (shared) ──────────────────────────────────
let tongueMat = null;
function getMat(scene) {
  if (tongueMat) return tongueMat;
  tongueMat = new StandardMaterial('tongueMat', scene);
  tongueMat.diffuseColor = new Color3(0.9, 0.35, 0.35);
  tongueMat.specularColor = new Color3(0.4, 0.15, 0.15);
  tongueMat.emissiveColor = new Color3(0.15, 0.02, 0.02);
  return tongueMat;
}

// ── Helpers ───────────────────────────────────────────────────
function makePath(from, to, segments = 8) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    pts.push(Vector3.Lerp(from, to, i / segments));
  }
  return pts;
}

function makeSpiralPath(center, progress, height) {
  const pts = [];
  const N = CONFIG.SPIRAL_PATH_POINTS;
  const maxR = lerp(CONFIG.SPIRAL_MIN_RADIUS, CONFIG.SPIRAL_MAX_RADIUS, progress);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const angle = t * CONFIG.SPIRAL_ROTATIONS * Math.PI * 2;
    const r = lerp(0.1, maxR, t);
    pts.push(new Vector3(
      center.x + Math.cos(angle) * r,
      height + 0.8 - t * 0.3,
      center.z + Math.sin(angle) * r,
    ));
  }
  return pts;
}

// ═══════════════════════════════════════════════════════════════
export function createTongue(scene, player, fliesSystem, audio, vfx) {
  // ── State ──────────────────────────────────────────────────
  const State = { IDLE: 0, EXTENDING: 1, DRAGGING: 2, RETRACTING: 3, SPIRAL: 4 };
  let state = State.IDLE;

  // Targeted
  let tongueMesh = null;
  let tongueProgress = 0;   // 0→1 extension progress
  let tongueTarget = null;   // Vector3 aim point
  let targetFly = null;
  let dragTimer = 0;
  let dragStartPos = null;

  // Spiral
  let spiralMesh = null;
  let spiralTimer = 0;
  let spiralCooldown = 0;

  // Currently targeted fly (for reticle highlight)
  let hoveredFly = null;

  // ── Input ──────────────────────────────────────────────────
  let lmbDown = false;
  let spiralInput = false;
  const canvas = scene.getEngine().getRenderingCanvas();

  canvas.addEventListener('mousedown', e => {
    if (!player.pointerLocked) return;
    if (e.button === 0) lmbDown = true;
    if (e.button === 2) spiralInput = true;
  });
  canvas.addEventListener('mouseup', e => {
    if (e.button === 0) lmbDown = false;
    if (e.button === 2) spiralInput = false;
  });
  window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'e') spiralInput = true; });
  window.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'e') spiralInput = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ── Find fly near aim ray ──────────────────────────────────
  function findTargetFly() {
    const origin = player.mouthWorldPos;
    const dir = player.getAimDirection();
    const aliveFles = fliesSystem.getAlive();
    let best = null, bestDist = Infinity;

    for (const fly of aliveFles) {
      const toFly = fly.root.position.subtract(origin);
      const along = Vector3.Dot(toFly, dir);
      if (along < 0 || along > CONFIG.TONGUE_MAX_RANGE) continue;
      const closest = origin.add(dir.scale(along));
      const perp = Vector3.Distance(fly.root.position, closest);
      if (perp < CONFIG.TONGUE_HIT_TOLERANCE && along < bestDist) {
        bestDist = along;
        best = fly;
      }
    }
    return best;
  }

  // ── Destroy meshes ─────────────────────────────────────────
  function disposeTongue() {
    if (tongueMesh) { tongueMesh.dispose(); tongueMesh = null; }
  }
  function disposeSpiral() {
    if (spiralMesh) { spiralMesh.dispose(); spiralMesh = null; }
  }

  // ── Create/update tongue tube ──────────────────────────────
  function updateTongueMesh(from, to) {
    const path = makePath(from, to);
    if (!tongueMesh) {
      tongueMesh = CreateTube('tongue', {
        path, radius: CONFIG.TONGUE_RADIUS, tessellation: 6,
        cap: Mesh.CAP_ALL, updatable: true,
      }, scene);
      tongueMesh.material = getMat(scene);
      tongueMesh.isPickable = false;
    } else {
      CreateTube('tongue', { path, radius: CONFIG.TONGUE_RADIUS, instance: tongueMesh });
    }
  }

  // ── Update loop ────────────────────────────────────────────
  function update(dt) {
    // Cooldown tick
    if (spiralCooldown > 0) spiralCooldown = Math.max(0, spiralCooldown - dt);

    // Hover detection (for reticle)
    hoveredFly = (state === State.IDLE) ? findTargetFly() : null;

    // ─── IDLE ────────────────────────────────────────────────
    if (state === State.IDLE) {
      // Targeted attack (LMB)
      if (lmbDown) {
        lmbDown = false; // consume click
        const origin = player.mouthWorldPos;
        const dir = player.getAimDirection();
        targetFly = findTargetFly();
        tongueTarget = targetFly
          ? targetFly.root.position.clone()
          : origin.add(dir.scale(CONFIG.TONGUE_MAX_RANGE));
        tongueProgress = 0;
        state = State.EXTENDING;
        audio.playExtend();
        return;
      }

      // Spiral (E / RMB)
      if (spiralInput && spiralCooldown <= 0) {
        state = State.SPIRAL;
        spiralTimer = 0;
        audio.startWhoosh();
        vfx.startSpiralParticles(player.frog);
        return;
      }
    }

    // ─── EXTENDING ──────────────────────────────────────────
    if (state === State.EXTENDING) {
      const origin = player.mouthWorldPos;
      const dist = Vector3.Distance(origin, tongueTarget);
      const speed = CONFIG.TONGUE_SPEED * dt;
      tongueProgress = clamp(tongueProgress + speed / Math.max(dist, 1), 0, 1);

      const currentEnd = Vector3.Lerp(origin, tongueTarget, Ease.outQuad(tongueProgress));
      updateTongueMesh(origin, currentEnd);
      vfx.emitTongueTrail(currentEnd);

      if (tongueProgress >= 1) {
        if (targetFly && targetFly.alive) {
          // Hit! Start dragging
          state = State.DRAGGING;
          dragTimer = 0;
          dragStartPos = targetFly.root.position.clone();
        } else {
          // Miss, retract
          state = State.RETRACTING;
          tongueProgress = 1;
        }
      }
      return;
    }

    // ─── DRAGGING ───────────────────────────────────────────
    if (state === State.DRAGGING) {
      dragTimer += dt;
      const t = clamp(dragTimer / CONFIG.TONGUE_DRAG_TIME, 0, 1);
      const eased = Ease.outBack(t);
      const origin = player.mouthWorldPos;

      if (targetFly && targetFly.alive) {
        targetFly.root.position = Vector3.Lerp(dragStartPos, origin, eased);
        updateTongueMesh(origin, targetFly.root.position);
      }

      if (t >= 1) {
        // Captured!
        if (targetFly && targetFly.alive) {
          fliesSystem.captureOne(targetFly);
          vfx.emitCaptureParticles(origin);
          vfx.triggerShake();
          audio.playSlurp();
          audio.playPop();
        }
        disposeTongue();
        targetFly = null;
        state = State.IDLE;
      }
      return;
    }

    // ─── RETRACTING ─────────────────────────────────────────
    if (state === State.RETRACTING) {
      const origin = player.mouthWorldPos;
      tongueProgress -= (CONFIG.TONGUE_RETRACT_SPEED * dt) / Math.max(CONFIG.TONGUE_MAX_RANGE, 1);
      if (tongueProgress <= 0) {
        disposeTongue();
        state = State.IDLE;
      } else {
        const currentEnd = Vector3.Lerp(origin, tongueTarget, tongueProgress);
        updateTongueMesh(origin, currentEnd);
      }
      return;
    }

    // ─── SPIRAL ─────────────────────────────────────────────
    if (state === State.SPIRAL) {
      spiralTimer += dt;
      const progress = clamp(spiralTimer / CONFIG.SPIRAL_DURATION, 0, 1);
      const center = player.position.clone();
      const height = center.y;

      // Update spiral mesh
      const path = makeSpiralPath(center, progress, height);
      if (!spiralMesh) {
        spiralMesh = CreateTube('spiral', {
          path, radius: CONFIG.SPIRAL_TONGUE_RADIUS, tessellation: 6,
          cap: Mesh.NO_CAP, updatable: true,
        }, scene);
        spiralMesh.material = getMat(scene);
        spiralMesh.isPickable = false;
      } else {
        CreateTube('spiral', { path, radius: CONFIG.SPIRAL_TONGUE_RADIUS, instance: spiralMesh });
      }

      // Capture flies in range
      const currentR = lerp(CONFIG.SPIRAL_MIN_RADIUS, CONFIG.SPIRAL_MAX_RADIUS, progress);
      for (const fly of fliesSystem.getAlive()) {
        const d = Vector3.Distance(fly.root.position, center);
        if (d <= currentR + 0.5) {
          fliesSystem.captureOne(fly);
          vfx.emitCaptureParticles(fly.root.position);
          audio.playSlurp();
        }
      }

      // End spiral
      if (!spiralInput || spiralTimer >= CONFIG.SPIRAL_DURATION) {
        disposeSpiral();
        audio.stopWhoosh();
        vfx.stopSpiralParticles();
        spiralCooldown = CONFIG.SPIRAL_COOLDOWN;
        state = State.IDLE;
      }
      return;
    }
  }

  return {
    update,
    get state() { return state; },
    get isIdle() { return state === State.IDLE; },
    get spiralCooldown() { return spiralCooldown; },
    get spiralCooldownMax() { return CONFIG.SPIRAL_COOLDOWN; },
    get hoveredFly() { return hoveredFly; },
  };
}
