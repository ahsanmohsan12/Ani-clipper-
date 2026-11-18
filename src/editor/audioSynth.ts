import type { RoyaltyFreeAudioAsset } from './defaultProject';

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 0.75;
  private masterMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterVolume > 0 && this.masterMuted) {
      this.masterMuted = false;
    }
  }

  public isMasterMuted(): boolean {
    return this.masterMuted;
  }

  public setMasterMuted(muted: boolean): void {
    this.masterMuted = muted;
  }

  /**
   * Plays a subtle studio transport cue when starting playback or stepping frames.
   */
  public triggerTransportCue(kind: 'play' | 'step' = 'step'): void {
    if (this.masterMuted || this.masterVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = kind === 'play' ? 330 : 240;
    osc.frequency.setValueAtTime(baseFreq, now);
    if (kind === 'play') {
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
    }
    gain.gain.setValueAtTime(0.06 * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === 'play' ? 0.11 : 0.04));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (kind === 'play' ? 0.12 : 0.05));
  }

  /**
   * Plays a synthesized preview of a CC0 Royalty-Free Music or SFX asset,
   * respecting speed, pitch-correction, and master volume settings.
   */
  public triggerAssetPreview(
    preset: RoyaltyFreeAudioAsset['synthPreset'],
    gainDb: number = -6,
    speed: number = 1.0,
    preservePitch: boolean = true
  ): void {
    if (this.masterMuted || this.masterVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    const linearGain =
      Math.min(1.0, Math.max(0.02, Math.pow(10, gainDb / 20) * 0.25)) * this.masterVolume;
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
      const notes =
        preset === 'analog-pulse'
          ? [220, 277.18, 329.63, 440]
          : [196, 246.94, 293.66, 369.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = preset === 'sub-drone' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq * pitchShift, now + idx * (0.12 / speed));
        noteGain.gain.setValueAtTime(linearGain * 0.6, now + idx * (0.12 / speed));
        noteGain.gain.exponentialRampToValueAtTime(
          0.001,
          now + idx * (0.12 / speed) + 0.45
        );
        osc.connect(noteGain);
        noteGain.connect(ctx.destination);
        osc.start(now + idx * (0.12 / speed));
        osc.stop(now + idx * (0.12 / speed) + 0.48);
      });
    }
  }
}

export const studioAudio = new StudioAudioEngine();
