import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CONFIG, lerp, lerpAngle, clamp } from './config.js';

// Side-effect needed for camera inputs
import '@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput';

function makeMat(name, color, scene, opts = {}) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromArray(color);
  m.specularColor = opts.specular
    ? Color3.FromArray(opts.specular)
    : new Color3(0.1, 0.1, 0.1);
  if (opts.specularPower) m.specularPower = opts.specularPower;
  if (opts.emissive) m.emissiveColor = Color3.FromArray(opts.emissive);
  return m;
}

function buildFrogModel(scene) {
  const root = new TransformNode('frog', scene);

  // ── Materials (richer palette, slight wet sheen) ──────────
  const bodyMat    = makeMat('frogBody',  [0.18, 0.62, 0.15], scene, { specular: [0.22, 0.25, 0.18], specularPower: 24 });
  const bodyDkMat  = makeMat('frogDk',    [0.12, 0.48, 0.10], scene, { specular: [0.18, 0.20, 0.14], specularPower: 28 });
  const headMat    = makeMat('frogHead',  [0.20, 0.66, 0.18], scene, { specular: [0.22, 0.25, 0.18], specularPower: 24 });
  const bellyMat   = makeMat('frogBelly', [0.82, 0.88, 0.42], scene, { specular: [0.15, 0.15, 0.10] });
  const jawMat     = makeMat('frogJaw',   [0.72, 0.82, 0.36], scene, { specular: [0.15, 0.15, 0.10] });
  const toeMat     = makeMat('frogToe',   [0.20, 0.56, 0.16], scene, { specular: [0.18, 0.22, 0.14] });
  const spotMat    = makeMat('frogSpot',  [0.08, 0.38, 0.06], scene, { specular: [0.14, 0.16, 0.10] });
  const eyeWMat    = makeMat('eyeW',      [0.96, 0.97, 0.93], scene, { specular: [0.5, 0.5, 0.5], specularPower: 64 });
  const irisMat    = makeMat('iris',      [0.62, 0.52, 0.06], scene, { specular: [0.4, 0.35, 0.1], specularPower: 48 });
  const pupilMat   = makeMat('pupil',     [0.02, 0.02, 0.02], scene, { specular: [0.3, 0.3, 0.3], specularPower: 96 });
  const nostrilMat = makeMat('nostril',   [0.10, 0.40, 0.08], scene);
  const mouthMat   = makeMat('mouthLine', [0.06, 0.18, 0.04], scene);

  const shadowCasters = [];

  // ── Main body (wide, flat, frog-shaped) ───────────────────
  const body = CreateBox('frogBody', { width: 1.25, height: 0.48, depth: 1.4 }, scene);
  body.material = bodyMat;
  body.parent = root;
  body.position.y = 0.34;
  shadowCasters.push(body);

  // Rounded back hump
  const hump = CreateBox('backHump', { width: 1.05, height: 0.18, depth: 0.85 }, scene);
  hump.material = bodyDkMat;
  hump.parent = root;
  hump.position.set(0, 0.60, -0.12);
  shadowCasters.push(hump);

  // Slight hip bulges (makes the body look rounder from above)
  for (const side of [-1, 1]) {
    const hip = CreateBox('hip', { width: 0.28, height: 0.35, depth: 0.6 }, scene);
    hip.material = bodyMat;
    hip.parent = root;
    hip.position.set(side * 0.62, 0.30, -0.25);
  }

  // ── Head (wider than long, flat profile) ──────────────────
  const head = CreateBox('frogHead', { width: 1.2, height: 0.36, depth: 0.55 }, scene);
  head.material = headMat;
  head.parent = root;
  head.position.set(0, 0.44, 0.78);
  shadowCasters.push(head);

  // Upper snout (tapers forward)
  const snout = CreateBox('snout', { width: 0.92, height: 0.22, depth: 0.32 }, scene);
  snout.material = headMat;
  snout.parent = root;
  snout.position.set(0, 0.40, 1.0);
  shadowCasters.push(snout);

  // Jaw / lower head
  const jaw = CreateBox('jaw', { width: 1.08, height: 0.14, depth: 0.52 }, scene);
  jaw.material = jawMat;
  jaw.parent = root;
  jaw.position.set(0, 0.28, 0.76);

  // Mouth line (dark seam)
  const mouthLine = CreateBox('mouthLine', { width: 0.85, height: 0.03, depth: 0.04 }, scene);
  mouthLine.material = mouthMat;
  mouthLine.parent = root;
  mouthLine.position.set(0, 0.33, 1.13);

  // ── Belly (lighter underside) ─────────────────────────────
  const belly = CreateBox('frogBelly', { width: 1.02, height: 0.2, depth: 1.15 }, scene);
  belly.material = bellyMat;
  belly.parent = root;
  belly.position.set(0, 0.15, 0.08);
  shadowCasters.push(belly);

  // Throat pouch (slightly different color under chin)
  const throat = CreateBox('throat', { width: 0.6, height: 0.12, depth: 0.3 }, scene);
  throat.material = bellyMat;
  throat.parent = root;
  throat.position.set(0, 0.20, 0.92);

  // ── Eyes (large, bulging, with iris + pupil) ──────────────
  for (const side of [-1, 1]) {
    // Eye socket bump (green dome that holds the eye)
    const eyeBump = CreateSphere('eyeBump', { diameter: 0.40, segments: 10 }, scene);
    eyeBump.material = bodyDkMat;
    eyeBump.parent = root;
    eyeBump.position.set(side * 0.38, 0.68, 0.70);

    // Eyeball
    const eyeWhite = CreateSphere('eye', { diameter: 0.32, segments: 10 }, scene);
    eyeWhite.material = eyeWMat;
    eyeWhite.parent = root;
    eyeWhite.position.set(side * 0.38, 0.76, 0.74);

    // Golden iris
    const iris = CreateSphere('iris', { diameter: 0.20, segments: 8 }, scene);
    iris.material = irisMat;
    iris.parent = root;
    iris.position.set(side * 0.38, 0.78, 0.86);

    // Dark pupil
    const pupil = CreateSphere('pupil', { diameter: 0.10, segments: 6 }, scene);
    pupil.material = pupilMat;
    pupil.parent = root;
    pupil.position.set(side * 0.38, 0.79, 0.90);
  }

  // ── Nostrils ──────────────────────────────────────────────
  for (const side of [-1, 1]) {
    const nostril = CreateSphere('nostril', { diameter: 0.08, segments: 5 }, scene);
    nostril.material = nostrilMat;
    nostril.parent = root;
    nostril.position.set(side * 0.18, 0.50, 1.14);
  }

  // ── Back legs (powerful, folded) ──────────────────────────
  for (const side of [-1, 1]) {
    // Thigh
    const thigh = CreateBox('bThigh', { width: 0.30, height: 0.28, depth: 0.55 }, scene);
    thigh.material = bodyMat;
    thigh.parent = root;
    thigh.position.set(side * 0.64, 0.22, -0.35);
    thigh.rotation.x = -0.3;

    // Calf
    const calf = CreateBox('bCalf', { width: 0.22, height: 0.22, depth: 0.48 }, scene);
    calf.material = bodyMat;
    calf.parent = root;
    calf.position.set(side * 0.68, 0.10, -0.72);
    calf.rotation.x = 0.35;

    // Foot
    const foot = CreateBox('bFoot', { width: 0.38, height: 0.07, depth: 0.40 }, scene);
    foot.material = toeMat;
    foot.parent = root;
    foot.position.set(side * 0.68, 0.04, -0.92);

    // Toes (3 spread toes)
    for (let t = -1; t <= 1; t++) {
      const toe = CreateBox('bToe', { width: 0.09, height: 0.05, depth: 0.16 }, scene);
      toe.material = toeMat;
      toe.parent = root;
      toe.position.set(side * 0.68 + t * 0.12, 0.03, -1.12);
    }
  }

  // ── Front legs (smaller, arms) ────────────────────────────
  for (const side of [-1, 1]) {
    // Upper arm
    const arm = CreateBox('fArm', { width: 0.18, height: 0.22, depth: 0.25 }, scene);
    arm.material = bodyMat;
    arm.parent = root;
    arm.position.set(side * 0.56, 0.18, 0.52);

    // Forearm
    const forearm = CreateBox('fForearm', { width: 0.15, height: 0.18, depth: 0.22 }, scene);
    forearm.material = bodyMat;
    forearm.parent = root;
    forearm.position.set(side * 0.53, 0.10, 0.70);

    // Hand
    const hand = CreateBox('fHand', { width: 0.20, height: 0.06, depth: 0.16 }, scene);
    hand.material = toeMat;
    hand.parent = root;
    hand.position.set(side * 0.53, 0.03, 0.82);

    // Front toes (smaller)
    for (let t = -1; t <= 1; t++) {
      const ftoe = CreateBox('fToe', { width: 0.06, height: 0.04, depth: 0.10 }, scene);
      ftoe.material = toeMat;
      ftoe.parent = root;
      ftoe.position.set(side * 0.53 + t * 0.07, 0.03, 0.92);
    }
  }

  // ── Dorsal spots (dark patches on back) ───────────────────
  const spots = [
    [0.22, 0.62, -0.05, 0.20], [-0.26, 0.63, 0.18, 0.16],
    [0.08, 0.61, -0.32, 0.18], [-0.18, 0.62, -0.22, 0.14],
    [0.32, 0.62, 0.28, 0.13],
  ];
  for (const [sx, sy, sz, size] of spots) {
    const spot = CreateBox('spot', { width: size, height: 0.06, depth: size }, scene);
    spot.material = spotMat;
    spot.parent = root;
    spot.position.set(sx, sy, sz);
  }

  // Mouth position marker (invisible, used for tongue origin)
  const mouth = new TransformNode('mouthPoint', scene);
  mouth.parent = root;
  mouth.position.set(0, 0.36, 1.16);

  // Shadow casters
  if (scene._shadowGenerator) {
    shadowCasters.forEach(m => scene._shadowGenerator.addShadowCaster(m));
  }

  return { root, mouth };
}

export function createPlayer(scene, world) {
  const canvas = scene.getEngine().getRenderingCanvas();
  const { root: frog, mouth } = buildFrogModel(scene);

  // Start above terrain center
  const startHeight = world.getHeight(0, 0);
  frog.position = new Vector3(0, startHeight, 0);

  // ─── Camera ─────────────────────────────────────────────────
  const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 4, CONFIG.CAMERA_DISTANCE, frog.position.clone(), scene);
  camera.minZ = 0.3;
  camera.maxZ = 300;
  camera.lowerRadiusLimit = CONFIG.CAMERA_DISTANCE;
  camera.upperRadiusLimit = CONFIG.CAMERA_DISTANCE;
  camera.lowerBetaLimit = 0.25;
  camera.upperBetaLimit = 1.45;
  camera.detachControl();
  scene.activeCamera = camera;

  // Manual mouse look with pointer lock
  let cAlpha = camera.alpha;
  let cBeta = camera.beta;
  let pointerLocked = false;

  canvas.addEventListener('click', () => {
    if (!pointerLocked) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    cAlpha -= e.movementX * CONFIG.MOUSE_SENSITIVITY;
    cBeta = clamp(cBeta - e.movementY * CONFIG.MOUSE_SENSITIVITY, 0.25, 1.45);
  });

  // ─── Input state ────────────────────────────────────────────
  const keys = { w: false, a: false, s: false, d: false, space: false };
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'w') keys.w = true;
    if (k === 'a') keys.a = true;
    if (k === 's') keys.s = true;
    if (k === 'd') keys.d = true;
    if (k === ' ') keys.space = true;
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'w') keys.w = false;
    if (k === 'a') keys.a = false;
    if (k === 's') keys.s = false;
    if (k === 'd') keys.d = false;
    if (k === ' ') keys.space = false;
  });

  // ─── Physics state ──────────────────────────────────────────
  let velocityY = 0;
  let onGround = false;

  function update(dt) {
    // Camera forward / right (XZ plane)
    const forward = new Vector3(-Math.sin(cAlpha), 0, -Math.cos(cAlpha));
    const right = new Vector3(forward.z, 0, -forward.x);

    // Movement
    const move = Vector3.Zero();
    if (keys.w) move.addInPlace(forward);
    if (keys.s) move.subtractInPlace(forward);
    if (keys.a) move.subtractInPlace(right);
    if (keys.d) move.addInPlace(right);

    if (move.lengthSquared() > 0.001) {
      move.normalize().scaleInPlace(CONFIG.PLAYER_SPEED * dt);
      frog.position.addInPlace(move);

      // Rotate frog to face movement direction
      const target = Math.atan2(move.x, move.z);
      frog.rotation.y = lerpAngle(frog.rotation.y, target, 0.18);
    }

    // Gravity + jump
    const groundY = world.getHeight(frog.position.x, frog.position.z);
    velocityY += CONFIG.PLAYER_GRAVITY * dt;

    if (keys.space && onGround) {
      velocityY = CONFIG.PLAYER_JUMP_FORCE;
      onGround = false;
    }

    frog.position.y += velocityY * dt;

    if (frog.position.y <= groundY) {
      frog.position.y = groundY;
      velocityY = 0;
      onGround = true;
    }

    // Smooth camera follow
    camera.alpha = cAlpha;
    camera.beta = cBeta;
    const targetPos = frog.position.add(new Vector3(0, CONFIG.CAMERA_HEIGHT_OFFSET * 0.3, 0));
    camera.target = Vector3.Lerp(camera.target, targetPos, CONFIG.CAMERA_SMOOTH);
  }

  // Public API
  return {
    frog,
    mouth,
    camera,
    keys,
    update,
    get position() { return frog.position; },
    get mouthWorldPos() { return mouth.getAbsolutePosition(); },
    getAimDirection() {
      return camera.target.subtract(camera.position).normalize();
    },
    get pointerLocked() { return pointerLocked; },
  };
}
