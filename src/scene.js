import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { CONFIG } from './config.js';

// Side-effect imports required by Babylon.js tree-shaking
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent';
import '@babylonjs/core/Materials/standardMaterial';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/tubeBuilder';

export function createScene(engine) {
  const scene = new Scene(engine);
  const [sr, sg, sb] = CONFIG.SKY_COLOR;
  scene.clearColor = new Color4(sr, sg, sb, 1);
  scene.ambientColor = new Color3(0.3, 0.3, 0.35);

  // ─── Fog ────────────────────────────────────────────────────
  const [fr, fg, fb] = CONFIG.FOG_COLOR;
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = CONFIG.FOG_DENSITY;
  scene.fogColor = new Color3(fr, fg, fb);

  // ─── Hemisphere (ambient fill) ──────────────────────────────
  const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.85;
  hemi.diffuse = new Color3(0.95, 0.95, 1.0);
  hemi.groundColor = new Color3(0.4, 0.35, 0.3);

  // ─── Directional (sun + shadows) ───────────────────────────
  const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.4).normalize(), scene);
  sun.intensity = 1.3;
  sun.diffuse = new Color3(1, 0.96, 0.88);
  sun.position = new Vector3(30, 50, 30);

  const shadowGen = new ShadowGenerator(1024, sun);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 16;
  shadowGen.depthScale = 50;
  scene._shadowGenerator = shadowGen; // store ref for other modules

  return scene;
}

export function setupPostProcessing(scene, camera) {
  // ─── Default pipeline (bloom, FXAA, tonemapping) ───────────
  const pipeline = new DefaultRenderingPipeline('default', true, scene, [camera]);
  pipeline.bloomEnabled = true;
  pipeline.bloomWeight = CONFIG.BLOOM_WEIGHT;
  pipeline.bloomThreshold = CONFIG.BLOOM_THRESHOLD;
  pipeline.bloomKernel = CONFIG.BLOOM_KERNEL;
  pipeline.fxaaEnabled = CONFIG.FXAA_ENABLED;

  if (pipeline.imageProcessingEnabled) {
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipeline.imageProcessing.exposure = CONFIG.TONEMAP_EXPOSURE;
    pipeline.imageProcessing.contrast = 1.1;
  }

  // ─── SSAO2 ──────────────────────────────────────────────────
  if (CONFIG.SSAO_ENABLED) {
    try {
      const ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 });
      ssao.radius = CONFIG.SSAO_RADIUS;
      ssao.totalStrength = 1.0;
      ssao.samples = CONFIG.SSAO_SAMPLES;
      scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', camera);
    } catch (e) {
      console.warn('[RaNota] SSAO2 not available:', e.message);
    }
  }

  return pipeline;
}
