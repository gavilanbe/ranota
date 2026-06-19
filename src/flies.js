import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CONFIG, lerp } from './config.js';

function randomRange(min, max) { return min + Math.random() * (max - min); }

class Fly {
  constructor(scene, world, index) {
    this.scene = scene;
    this.world = world;
    this.captured = false;
    this.respawnTimer = 0;
    this.alive = true;
    this.time = Math.random() * 100;
    this.wanderTimer = Math.random() * CONFIG.FLY_WANDER_INTERVAL;

    // Mesh
    this.root = new TransformNode(`fly_${index}`, scene);

    const body = CreateSphere(`flyBody_${index}`, { diameter: CONFIG.FLY_SIZE, segments: 6 }, scene);
    if (!Fly._bodyMat) {
      Fly._bodyMat = new StandardMaterial('flyBodyMat', scene);
      Fly._bodyMat.diffuseColor = new Color3(0.12, 0.12, 0.15);
      Fly._bodyMat.specularColor = new Color3(0.3, 0.3, 0.3);
    }
    body.material = Fly._bodyMat;
    body.parent = this.root;

    // Wings
    for (const side of [-1, 1]) {
      const wing = CreateBox(`flyWing_${index}_${side}`, {
        width: CONFIG.FLY_WING_SIZE,
        height: 0.02,
        depth: CONFIG.FLY_WING_SIZE * 0.6,
      }, scene);
      if (!Fly._wingMat) {
        Fly._wingMat = new StandardMaterial('flyWingMat', scene);
        Fly._wingMat.diffuseColor = new Color3(0.6, 0.65, 0.7);
        Fly._wingMat.alpha = 0.5;
      }
      wing.material = Fly._wingMat;
      wing.parent = this.root;
      wing.position.set(side * CONFIG.FLY_SIZE * 0.6, CONFIG.FLY_SIZE * 0.3, 0);
      wing._side = side;
      this['wing' + (side > 0 ? 'R' : 'L')] = wing;
    }

    // Spawn position
    this._spawn();
    this.targetPos = this.root.position.clone();
    this._pickNewTarget();
  }

  _spawn() {
    const angle = Math.random() * Math.PI * 2;
    const dist = randomRange(3, CONFIG.FLY_SPAWN_RADIUS);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const groundY = this.world.getHeight(x, z);
    const y = groundY + randomRange(CONFIG.FLY_HEIGHT_MIN, CONFIG.FLY_HEIGHT_MAX);
    this.root.position.set(x, y, z);
    this.captured = false;
    this.alive = true;
    this.root.setEnabled(true);
  }

  _pickNewTarget() {
    const cur = this.root.position;
    const angle = Math.random() * Math.PI * 2;
    const dist = randomRange(2, 8);
    const tx = cur.x + Math.cos(angle) * dist;
    const tz = cur.z + Math.sin(angle) * dist;
    const groundY = this.world.getHeight(tx, tz);
    const ty = groundY + randomRange(CONFIG.FLY_HEIGHT_MIN, CONFIG.FLY_HEIGHT_MAX);
    // Clamp to world bounds
    this.targetPos.set(
      Math.max(-CONFIG.FLY_SPAWN_RADIUS, Math.min(CONFIG.FLY_SPAWN_RADIUS, tx)),
      ty,
      Math.max(-CONFIG.FLY_SPAWN_RADIUS, Math.min(CONFIG.FLY_SPAWN_RADIUS, tz)),
    );
    this.wanderTimer = CONFIG.FLY_WANDER_INTERVAL + Math.random();
  }

  capture() {
    this.captured = true;
    this.alive = false;
    this.root.setEnabled(false);
    this.respawnTimer = CONFIG.FLY_RESPAWN_TIME;
  }

  update(dt, playerPos) {
    if (!this.alive) {
      // Respawn timer
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this._spawn();
      return;
    }

    this.time += dt;
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) this._pickNewTarget();

    // Move toward target
    const dir = this.targetPos.subtract(this.root.position);
    const dist = dir.length();
    if (dist > 0.5) {
      dir.normalize();
      this.root.position.addInPlace(dir.scale(CONFIG.FLY_SPEED * dt));
    } else {
      this._pickNewTarget();
    }

    // Avoidance from player
    const toPlayer = playerPos.subtract(this.root.position);
    const pDist = toPlayer.length();
    if (pDist < CONFIG.FLY_AVOIDANCE_DIST && pDist > 0.01) {
      const flee = toPlayer.normalize().scale(-CONFIG.FLY_AVOIDANCE_STRENGTH * dt * (1 - pDist / CONFIG.FLY_AVOIDANCE_DIST));
      this.root.position.addInPlace(flee);
    }

    // Bob
    this.root.position.y += Math.sin(this.time * CONFIG.FLY_BOB_SPEED) * CONFIG.FLY_BOB_AMP * dt;

    // Wing flap
    const wingAngle = Math.sin(this.time * 25) * 0.5;
    if (this.wingR) this.wingR.rotation.z = wingAngle;
    if (this.wingL) this.wingL.rotation.z = -wingAngle;

    // Prevent going below terrain
    const minY = this.world.getHeight(this.root.position.x, this.root.position.z) + 0.5;
    if (this.root.position.y < minY) this.root.position.y = minY;
  }
}
Fly._bodyMat = null;
Fly._wingMat = null;

export function createFlies(scene, world) {
  const flies = [];
  let capturedCount = 0;

  for (let i = 0; i < CONFIG.FLY_COUNT; i++) {
    flies.push(new Fly(scene, world, i));
  }

  function update(dt, playerPos) {
    for (const f of flies) f.update(dt, playerPos);
  }

  function getAlive() {
    return flies.filter(f => f.alive && !f.captured);
  }

  function captureOne(fly) {
    fly.capture();
    capturedCount++;
  }

  return {
    flies,
    update,
    getAlive,
    captureOne,
    get capturedCount() { return capturedCount; },
  };
}
