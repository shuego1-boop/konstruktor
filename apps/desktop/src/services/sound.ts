/**
 * Procedural sound synthesis for Desktop Preview using Web Audio API.
 * Mirrors apps/player/src/services/sound.ts — no external sound files.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
  delay = 0,
): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + delay);
  gain.gain.setValueAtTime(volume, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    c.currentTime + delay + duration,
  );
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration + 0.05);
}

export function isMuted(): boolean {
  return localStorage.getItem("preview_sound_muted") === "1";
}

export function toggleMute(): boolean {
  const next = !isMuted();
  localStorage.setItem("preview_sound_muted", next ? "1" : "0");
  return next;
}

/** Short click when selecting an option */
export function playSelect(): void {
  if (isMuted()) return;
  tone(700, 0.03, "sine", 0.12);
}

/** Rising ding for correct answer */
export function playCorrect(): void {
  if (isMuted()) return;
  tone(523.25, 0.08, "sine", 0.3);
  tone(659.25, 0.15, "sine", 0.3, 0.08);
}

/** Soft descending buzz for wrong answer */
export function playWrong(): void {
  if (isMuted()) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.18);
  gain.gain.setValueAtTime(0.18, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
  osc.start();
  osc.stop(c.currentTime + 0.22);
}

/** Metronome tick for timer urgency */
export function playTick(): void {
  if (isMuted()) return;
  tone(1100, 0.025, "square", 0.07);
}

/** Triumphant fanfare on quiz pass */
export function playFinishWin(): void {
  if (isMuted()) return;
  tone(523.25, 0.12, "sine", 0.3);
  tone(659.25, 0.12, "sine", 0.3, 0.14);
  tone(783.99, 0.3, "sine", 0.35, 0.28);
}

/** Soft descending sequence on quiz fail */
export function playFinishLose(): void {
  if (isMuted()) return;
  tone(523.25, 0.12, "sine", 0.22);
  tone(466.16, 0.12, "sine", 0.22, 0.14);
  tone(392, 0.28, "sine", 0.25, 0.28);
}
