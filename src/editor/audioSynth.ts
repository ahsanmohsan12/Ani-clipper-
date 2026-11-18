import type { RoyaltyFreeAudioAsset } from './defaultProject';

class StudioAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a synthesized preview of a CC0 Royalty-Free Music or SFX asset,
   * respecting speed and pitch-correction settings.
   */
  public triggerAssetPreview(
    preset: RoyaltyFreeAudioAsset['synthPreset'],
    gainDb: number = -6,
    speed: number = 1.0,
    preservePitch: boolean = true
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    const linearGain = Math.min(1.0, Math.max(0.02, Math.pow(10, gainDb / 20) * 0.25));
    masterGain.gain.setValueAtTime(linearGain, now);
    masterGain.connect(ctx.destination);

    const pitchShift = preservePitch ? 1.0 : speed;

    if (preset === 'whoosh-transition') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140 * pitchShift, now);
      osc.frequency.exponentialRampToValueAtTime(520 * pitchShift, now + 0.18 / speed);
      osc.frequency.exponentialRampToValueAtTime(90 * pitchShift, now + 0.45 / speed);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48 / speed);
      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.5 / speed);
    } else if (preset === 'camera-shutter') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880 * pitchShift, now);
      osc.frequency.exponentialRampToValueAtTime(180 * pitchShift, now + 0.09);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.14);
    } else {
      // Musical chord arpeggio preview
      const notes = preset === 'analog-pulse' ? [220, 277.18, 329.63, 440] : [196, 246.94, 293.66, 369.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = preset === 'sub-drone' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq * pitchShift, now + idx * (0.12 / speed));
        noteGain.gain.setValueAtTime(linearGain * 0.6, now + idx * (0.12 / speed));
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * (0.12 / speed) + 0.45);
        osc.connect(noteGain);
        noteGain.connect(ctx.destination);
        osc.start(now + idx * (0.12 / speed));
        osc.stop(now + idx * (0.12 / speed) + 0.48);
      });
    }
  }
}

export const studioAudio = new StudioAudioEngine();
