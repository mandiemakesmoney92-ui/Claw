/**
 * Audio unlock utility for CLAW.
 *
 * Browsers block programmatic audio that isn't triggered by a direct user
 * gesture. This module provides a reliable unlock mechanism plus a simple
 * blob-based playback helper that works across all major browsers.
 */

let _unlocked = false;

// Minimal silent WAV (44-byte header, 0 samples) as a data URL
const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

/**
 * Call from any synchronous user-interaction handler (click, touch, keydown).
 * After this runs once, `playAudioBlob()` works from any async context.
 */
export async function unlockAudio(): Promise<void> {
  if (_unlocked) return;
  try {
    // AudioContext resume — most reliable way to grant page-wide audio permission
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume();
      // Play a 1-sample silent buffer to confirm the unlock
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      _unlocked = true;
      return;
    }
  } catch { /* fallthrough */ }

  // Fallback: silent audio element
  try {
    const el = new Audio(SILENT_WAV);
    el.volume = 0.001;
    await el.play();
    _unlocked = true;
  } catch { /* give up — user needs to interact more */ }
}

/** True after the first successful `unlockAudio()` call. */
export function isAudioUnlocked(): boolean {
  return _unlocked;
}

/**
 * Play an audio Blob (e.g. MP3 from ElevenLabs).
 * Works reliably after `unlockAudio()` has been called once.
 * Returns a Promise that resolves when playback finishes or fails.
 */
export function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = 1.0;

    const cleanup = () => { URL.revokeObjectURL(url); resolve(); };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    // Start playback
    const attempt = () => audio.play().catch(cleanup);

    if (audio.readyState >= 3) {
      attempt();
    } else {
      audio.oncanplaythrough = attempt;
      audio.load();
    }
  });
}
