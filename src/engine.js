import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';

// Load all WebGPU extensions (dynamic textures, alpha, raw textures, etc.)
import '@babylonjs/core/Engines/WebGPU/Extensions/index';

export async function initEngine(canvasId) {
  const canvas = document.getElementById(canvasId);

  // Try WebGPU first
  if (navigator.gpu) {
    try {
      const engine = new WebGPUEngine(canvas, {
        adaptToDeviceRatio: true,
        antialias: true,
      });
      await engine.initAsync();
      console.log('[RaNota] WebGPU engine ready');
      return engine;
    } catch (e) {
      console.warn('[RaNota] WebGPU init failed, falling back to WebGL:', e);
    }
  }

  // Fallback to WebGL2
  const engine = new Engine(canvas, true, {
    adaptToDeviceRatio: true,
    stencil: true,
  });
  console.log('[RaNota] WebGL engine ready');
  return engine;
}
