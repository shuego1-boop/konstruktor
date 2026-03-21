/**
 * Procedural sound synthesis using Web Audio API.
 * No external sound files required — all sounds are generated programmatically.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === "suspended") ctx.resume();
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
  return localStorage.getItem("sound_muted") === "1";
}

export function setMuted(value: boolean): void {
  localStorage.setItem("sound_muted", value ? "1" : "0");
}

export function toggleMute(): boolean {
  const next = !isMuted();
  setMuted(next);
  return next;
}

/** Short mid-frequency click when selecting an option */
export function playSelect(): void {
  if (isMuted()) return;
  tone(700, 0.03, "sine", 0.12);
}

/** Rising ding for correct answer */
export function playCorrect(): void {
  if (isMuted()) return;
  tone(523.25, 0.08, "sine", 0.3); // C5
  tone(659.25, 0.15, "sine", 0.3, 0.08); // E5
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

/** Escalating arpeggio for streak (3+ correct in a row) */
export function playStreak(): void {
  if (isMuted()) return;
  tone(523.25, 0.1, "sine", 0.28); // C5
  tone(659.25, 0.1, "sine", 0.28, 0.11); // E5
  tone(783.99, 0.18, "sine", 0.32, 0.22); // G5
}

/** Metronome-like tick for last-5-seconds timer */
export function playTick(): void {
  if (isMuted()) return;
  tone(1100, 0.025, "square", 0.07);
}

/** Single tone for each countdown number */
export function playCountdown(n: 1 | 2 | 3): void {
  if (isMuted()) return;
  const freqs: Record<1 | 2 | 3, number> = { 3: 392, 2: 440, 1: 523.25 };
  tone(freqs[n], 0.18, "sine", 0.28);
}

/** Triumphant fanfare on quiz pass */
export function playFinishWin(): void {
  if (isMuted()) return;
  tone(523.25, 0.12, "sine", 0.3); // C5
  tone(659.25, 0.12, "sine", 0.3, 0.14); // E5
  tone(783.99, 0.3, "sine", 0.35, 0.28); // G5
}

/** Soft descending sequence on quiz fail — not harsh */
export function playFinishLose(): void {
  if (isMuted()) return;
  tone(523.25, 0.12, "sine", 0.22); // C5
  tone(466.16, 0.12, "sine", 0.22, 0.14); // Bb4
  tone(392, 0.28, "sine", 0.25, 0.28); // G4
}
