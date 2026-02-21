import { EffectSlot } from './effect.js'
import type { ReverbParams } from '../../types.js'

export class ReverbEffect {
  readonly slot: EffectSlot
  private readonly ctx: BaseAudioContext
  private readonly convolver: ConvolverNode
  private readonly preDelayNode: DelayNode
  private _decay: number

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx
    this._decay = 2

    this.preDelayNode = ctx.createDelay(0.2)
    this.preDelayNode.delayTime.value = 0.02

    this.convolver = ctx.createConvolver()
    this.convolver.buffer = this.generateIR(this._decay)

    this.preDelayNode.connect(this.convolver)

    this.slot = new EffectSlot(ctx, this.preDelayNode, this.convolver)
  }

  get input(): AudioNode { return this.slot.input }
  get output(): AudioNode { return this.slot.output }

  update(p: Partial<ReverbParams>): void {
    if (p.enabled !== undefined) this.slot.enabled = p.enabled
    if (p.mix !== undefined) this.slot.mix = p.mix
    if (p.preDelay !== undefined) {
      this.preDelayNode.delayTime.setTargetAtTime(p.preDelay, this.ctx.currentTime, 0.02)
    }
    if (p.decay !== undefined && p.decay !== this._decay) {
      this._decay = p.decay
      this.convolver.buffer = this.generateIR(p.decay)
    }
  }

  private generateIR(decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate
    const length = Math.floor(rate * decay)
    const buffer = this.ctx.createBuffer(2, length, rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length)
      }
    }
    return buffer
  }
}
