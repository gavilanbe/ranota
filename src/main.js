import { initEngine } from './engine.js';
import { createScene, setupPostProcessing } from './scene.js';
import { createVoxelWorld } from './voxelWorld.js';
import { createPlayer } from './player.js';
import { createFlies } from './flies.js';
import { createTongue } from './tongue.js';
import { initAudio } from './audio.js';
import { initVFX } from './vfx.js';
import { createUI } from './ui.js';

async function main() {
  const engine = await initEngine('renderCanvas');
  const scene = createScene(engine);
  const world = createVoxelWorld(scene);
  const audio = initAudio();
  const player = createPlayer(scene, world);
  const fliesSystem = createFlies(scene, world);
  const vfx = initVFX(scene);
  const tongue = createTongue(scene, player, fliesSystem, audio, vfx);
  const ui = createUI(scene, player, tongue, fliesSystem);

  // Post-processing (needs camera)
  setupPostProcessing(scene, player.camera);

  // Hide loading screen
  document.getElementById('loading').classList.add('hidden');

  // Show click-to-play prompt
  const prompt = document.getElementById('click-prompt');
  prompt.classList.remove('hidden');

  // Unlock audio on first interaction
  const unlock = () => {
    audio.resume();
    prompt.classList.add('hidden');
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('keydown', unlock);

  // ─── Game loop ──────────────────────────────────────────────
  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05); // cap dt
    player.update(dt);
    fliesSystem.update(dt, player.position);
    tongue.update(dt);
    vfx.update(dt);
    ui.update(dt);
    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());
}

main().catch(err => {
  console.error('[RaNota] Fatal:', err);
  document.getElementById('loading').textContent = 'Error: ' + err.message;
});
