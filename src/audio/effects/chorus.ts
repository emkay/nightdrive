import { EffectSlot } from './effect.js';
import type { ChorusParams } from '../../types.js';

export class ChorusEffect {
  readonly slot: EffectSlot;
  private readonly ctx: BaseAudioContext;
  private readonly delayNode: DelayNode;
  private readonly lfo: OscillatorNode;
  private readonly lfoGain: GainNode;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;

    this.delayNode = ctx.createDelay(0.05);
    this.delayNode.delayTime.value = 0.015;

    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 1.5;

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 0.0025; // depth 0.5 → 2.5ms

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);
    this.lfo.start();

    this.slot = new EffectSlot(ctx, this.delayNode, this.delayNode);
  }

  get input(): AudioNode { return this.slot.input; }
  get output(): AudioNode { return this.slot.output; }

  update(p: Partial<ChorusParams>): void {
    if (p.enabled !== undefined) this.slot.enabled = p.enabled;
    if (p.mix !== undefined) this.slot.mix = p.mix;
    const t = this.ctx.currentTime;
    if (p.rate !== undefined) {
      this.lfo.frequency.setTargetAtTime(p.rate, t, 0.02);
    }
    if (p.depth !== undefined) {
      this.lfoGain.gain.setTargetAtTime(p.depth * 0.005, t, 0.02);
    }
    if (p.delay !== undefined) {
      this.delayNode.delayTime.setTargetAtTime(p.delay / 1000, t, 0.02);
    }
  }
}
