import { CONFIG } from './config.js';

export function initAudio() {
  let ctx = null;
  let masterGain = null;
  let whooshOsc = null;
  let whooshGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = CONFIG.MASTER_VOLUME;
      masterGain.connect(ctx.destination);
      return true;
    } catch { return false; }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function randomPitch(min, max) { return min + Math.random() * (max - min); }

  // ─── Slurp ──────────────────────────────────────────────────
  function playSlurp() {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const pitch = randomPitch(CONFIG.SLURP_PITCH_MIN, CONFIG.SLURP_PITCH_MAX);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(70 * pitch, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    filter.Q.value = 6;

    gain.gain.setValueAtTime(CONFIG.SFX_VOLUME * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter).connect(gain).connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // ─── Pop ────────────────────────────────────────────────────
  function playPop() {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const pitch = randomPitch(0.9, 1.2);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(60 * pitch, now + 0.08);

    gain.gain.setValueAtTime(CONFIG.SFX_VOLUME * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain).connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // ─── Whoosh loop (spiral) ──────────────────────────────────
  function startWhoosh() {
    if (!ensure()) return;
    if (whooshOsc) return;

    whooshGain = ctx.createGain();
    whooshGain.gain.value = 0;
    whooshGain.connect(masterGain);

    // Noise via buffer
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 1.5;

    noise.connect(filter).connect(whooshGain);
    noise.start();
    whooshOsc = noise;

    // Fade in
    whooshGain.gain.setValueAtTime(0, ctx.currentTime);
    whooshGain.gain.linearRampToValueAtTime(CONFIG.SFX_VOLUME * 0.35, ctx.currentTime + 0.15);
  }

  function stopWhoosh() {
    if (!whooshOsc || !whooshGain) return;
    const now = ctx.currentTime;
    whooshGain.gain.linearRampToValueAtTime(0, now + 0.2);
    const ref = whooshOsc;
    setTimeout(() => { try { ref.stop(); } catch {} }, 300);
    whooshOsc = null;
    whooshGain = null;
  }

  // ─── Tongue extend sound ───────────────────────────────────
  function playExtend() {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    gain.gain.setValueAtTime(CONFIG.SFX_VOLUME * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain).connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  return { resume, playSlurp, playPop, startWhoosh, stopWhoosh, playExtend };
}
