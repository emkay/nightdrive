import { EffectsChain } from './effects-chain.js';

/**
 * AudioEngine — owns the AudioContext, master gain, and analyser.
 * Call start() on a user gesture to resume the context.
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  readonly masterGain: GainNode;
  readonly analyser: AnalyserNode;
  readonly effects: EffectsChain;

  private _started = false;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;

    this.effects = new EffectsChain(this.ctx);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.masterGain.connect(this.effects.input);
    this.effects.output.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  /** Resume the AudioContext (must be called from a user gesture). */
  async start(): Promise<void> {
    if (this._started) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this._started = true;
  }

  get started(): boolean {
    return this._started;
  }

  setMasterVolume(value: number): void {
    this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, value)),
      this.ctx.currentTime,
      0.01,
    );
  }

  /** The destination node for voices to connect to. */
  get destination(): GainNode {
    return this.masterGain;
  }
}
