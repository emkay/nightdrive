import type { EQParams } from '../../types.js';

export class EQEffect {
  readonly input: BiquadFilterNode;
  readonly output: BiquadFilterNode;
  private readonly low: BiquadFilterNode;
  private readonly mid: BiquadFilterNode;
  private readonly high: BiquadFilterNode;
  private _enabled = true;

  constructor(ctx: BaseAudioContext) {
    this.low = ctx.createBiquadFilter();
    this.low.type = 'lowshelf';
    this.low.frequency.value = 320;
    this.low.gain.value = 0;

    this.mid = ctx.createBiquadFilter();
    this.mid.type = 'peaking';
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 1;
    this.mid.gain.value = 0;

    this.high = ctx.createBiquadFilter();
    this.high.type = 'highshelf';
    this.high.frequency.value = 3200;
    this.high.gain.value = 0;

    this.low.connect(this.mid);
    this.mid.connect(this.high);

    this.input = this.low;
    this.output = this.high;
  }

  update(p: Partial<EQParams>): void {
    if (p.enabled !== undefined) this._enabled = p.enabled;
    const t = this.low.context.currentTime;
    if (!this._enabled) {
      this.low.gain.setTargetAtTime(0, t, 0.02);
      this.mid.gain.setTargetAtTime(0, t, 0.02);
      this.high.gain.setTargetAtTime(0, t, 0.02);
      return;
    }
    if (p.lowGain !== undefined) this.low.gain.setTargetAtTime(p.lowGain, t, 0.02);
    if (p.midGain !== undefined) this.mid.gain.setTargetAtTime(p.midGain, t, 0.02);
    if (p.midFreq !== undefined) this.mid.frequency.setTargetAtTime(p.midFreq, t, 0.02);
    if (p.highGain !== undefined) this.high.gain.setTargetAtTime(p.highGain, t, 0.02);
    // Re-apply gains when re-enabling
    if (p.enabled === true) {
      this.low.gain.setTargetAtTime(this.low.gain.value || 0, t, 0.02);
    }
  }
}
