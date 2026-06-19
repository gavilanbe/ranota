import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { CONFIG } from './config.js';

let circleTexture = null;

function getCircleTexture(scene) {
  if (circleTexture) return circleTexture;
  const dt = new DynamicTexture('particleTex', 64, scene, false);
  const ctx = dt.getContext();
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fill();
  dt.update();
  circleTexture = dt;
  return dt;
}

export function initVFX(scene) {
  let shakeTime = 0;
  let shakeIntensity = 0;
  const cameraOriginalTarget = null;

  // ─── Screen shake ───────────────────────────────────────────
  function triggerShake(intensity = CONFIG.SCREEN_SHAKE_INTENSITY) {
    shakeTime = CONFIG.SCREEN_SHAKE_DURATION;
    shakeIntensity = intensity;
  }

  // ─── Capture particles (saliva/sparkle) ─────────────────────
  function emitCaptureParticles(position) {
    const ps = new ParticleSystem('capture', 40, scene);
    ps.particleTexture = getCircleTexture(scene);
    ps.emitter = position.clone();
    ps.minSize = 0.04;
    ps.maxSize = 0.14;
    ps.minLifeTime = 0.15;
    ps.maxLifeTime = 0.5;
    ps.emitRate = CONFIG.PARTICLE_DENSITY * 2;
    ps.createSphereEmitter(0.3);
    ps.color1 = new Color4(0.7, 1, 0.7, 1);
    ps.color2 = new Color4(0.4, 1, 0.4, 0.8);
    ps.colorDead = new Color4(0.2, 0.8, 0.2, 0);
    ps.minEmitPower = 1.5;
    ps.maxEmitPower = 4;
    ps.gravity = new Vector3(0, -3, 0);
    ps.start();
    setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 800); }, 200);
  }

  // ─── Tongue trail particles ─────────────────────────────────
  function emitTongueTrail(position) {
    const ps = new ParticleSystem('trail', 15, scene);
    ps.particleTexture = getCircleTexture(scene);
    ps.emitter = position.clone();
    ps.minSize = 0.02;
    ps.maxSize = 0.08;
    ps.minLifeTime = 0.1;
    ps.maxLifeTime = 0.3;
    ps.emitRate = CONFIG.PARTICLE_DENSITY;
    ps.createSphereEmitter(0.15);
    ps.color1 = new Color4(0.9, 0.5, 0.5, 0.8);
    ps.color2 = new Color4(1, 0.7, 0.7, 0.5);
    ps.colorDead = new Color4(1, 0.3, 0.3, 0);
    ps.minEmitPower = 0.5;
    ps.maxEmitPower = 1.5;
    ps.gravity = new Vector3(0, -1, 0);
    ps.start();
    setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 600); }, 150);
  }

  // ─── Spiral sweep particles ─────────────────────────────────
  let spiralPS = null;

  function startSpiralParticles(emitterNode) {
    if (spiralPS) spiralPS.dispose();
    spiralPS = new ParticleSystem('spiral', 50, scene);
    spiralPS.particleTexture = getCircleTexture(scene);
    spiralPS.emitter = emitterNode;
    spiralPS.minSize = 0.03;
    spiralPS.maxSize = 0.1;
    spiralPS.minLifeTime = 0.2;
    spiralPS.maxLifeTime = 0.6;
    spiralPS.emitRate = CONFIG.PARTICLE_DENSITY;
    spiralPS.createSphereEmitter(0.4);
    spiralPS.color1 = new Color4(1, 0.6, 0.6, 0.9);
    spiralPS.color2 = new Color4(1, 0.85, 0.5, 0.6);
    spiralPS.colorDead = new Color4(1, 0.4, 0.2, 0);
    spiralPS.minEmitPower = 1;
    spiralPS.maxEmitPower = 3;
    spiralPS.gravity = new Vector3(0, 1, 0);
    spiralPS.start();
  }

  function stopSpiralParticles() {
    if (spiralPS) {
      spiralPS.stop();
      setTimeout(() => { if (spiralPS) { spiralPS.dispose(); spiralPS = null; } }, 1000);
    }
  }

  // ─── Update (screen shake) ─────────────────────────────────
  function update(dt) {
    if (shakeTime > 0) {
      shakeTime -= dt;
      const cam = scene.activeCamera;
      if (cam) {
        const decay = shakeTime / CONFIG.SCREEN_SHAKE_DURATION;
        const intensity = shakeIntensity * decay;
        cam.target.x += (Math.random() - 0.5) * intensity;
        cam.target.y += (Math.random() - 0.5) * intensity * 0.5;
        cam.target.z += (Math.random() - 0.5) * intensity;
      }
    }
  }

  return {
    triggerShake,
    emitCaptureParticles,
    emitTongueTrail,
    startSpiralParticles,
    stopSpiralParticles,
    update,
  };
}
