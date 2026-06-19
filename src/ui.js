import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { CONFIG } from './config.js';

export function createUI(scene, player, tongue, fliesSystem) {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);

  // ─── Reticle (center crosshair) ────────────────────────────
  const reticle = new Ellipse('reticle');
  reticle.width = CONFIG.RETICLE_SIZE + 'px';
  reticle.height = CONFIG.RETICLE_SIZE + 'px';
  reticle.color = CONFIG.RETICLE_NORMAL;
  reticle.thickness = 2.5;
  reticle.background = 'transparent';
  ui.addControl(reticle);

  // Inner dot
  const dot = new Ellipse('dot');
  dot.width = '5px';
  dot.height = '5px';
  dot.background = CONFIG.RETICLE_NORMAL;
  dot.color = 'transparent';
  ui.addControl(dot);

  // ─── Fly counter ───────────────────────────────────────────
  const counter = new TextBlock('counter');
  counter.text = 'Flies: 0';
  counter.color = '#eeffee';
  counter.fontSize = 22;
  counter.fontFamily = "'Courier New', monospace";
  counter.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  counter.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  counter.paddingLeft = '20px';
  counter.paddingTop = '20px';
  counter.outlineWidth = 2;
  counter.outlineColor = '#000000';
  ui.addControl(counter);

  // ─── Cooldown bar (spiral) ─────────────────────────────────
  const barBg = new Rectangle('cdBg');
  barBg.width = CONFIG.COOLDOWN_WIDTH + 'px';
  barBg.height = CONFIG.COOLDOWN_HEIGHT + 'px';
  barBg.color = '#ffffff44';
  barBg.background = '#00000055';
  barBg.thickness = 1;
  barBg.cornerRadius = 3;
  barBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  barBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  barBg.top = '-50px';
  ui.addControl(barBg);

  const barFill = new Rectangle('cdFill');
  barFill.width = '100%';
  barFill.height = '100%';
  barFill.background = '#44cc66cc';
  barFill.thickness = 0;
  barFill.cornerRadius = 3;
  barFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  barBg.addControl(barFill);

  const cdLabel = new TextBlock('cdLabel');
  cdLabel.text = '[E] Spiral';
  cdLabel.color = '#ccddcc';
  cdLabel.fontSize = 12;
  cdLabel.fontFamily = "'Courier New', monospace";
  cdLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  cdLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  cdLabel.top = '-62px';
  ui.addControl(cdLabel);

  // ─── Controls hint ─────────────────────────────────────────
  const hint = new TextBlock('hint');
  hint.text = 'WASD: Move  |  Space: Jump  |  LMB: Tongue  |  E/RMB: Spiral';
  hint.color = '#aaccaa88';
  hint.fontSize = 13;
  hint.fontFamily = "'Courier New', monospace";
  hint.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  hint.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  hint.paddingBottom = '16px';
  ui.addControl(hint);

  // ─── Update ────────────────────────────────────────────────
  function update(dt) {
    // Counter
    counter.text = `Flies: ${fliesSystem.capturedCount}`;

    // Reticle color
    const hasTarget = tongue.hoveredFly !== null;
    const col = hasTarget ? CONFIG.RETICLE_TARGET : CONFIG.RETICLE_NORMAL;
    reticle.color = col;
    dot.background = col;
    reticle.width = (hasTarget ? CONFIG.RETICLE_SIZE + 6 : CONFIG.RETICLE_SIZE) + 'px';
    reticle.height = reticle.width;

    // Cooldown bar
    const cd = tongue.spiralCooldown;
    const cdMax = tongue.spiralCooldownMax;
    if (cd > 0) {
      const pct = 1 - cd / cdMax;
      barFill.width = (pct * 100).toFixed(1) + '%';
      barFill.background = '#cc6644cc';
      barBg.isVisible = true;
      cdLabel.text = `[E] Cooldown ${cd.toFixed(1)}s`;
    } else {
      barFill.width = '100%';
      barFill.background = '#44cc66cc';
      barBg.isVisible = true;
      cdLabel.text = '[E] Spiral Ready';
    }
  }

  return { update };
}
