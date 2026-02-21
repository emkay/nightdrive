import { EffectSlot } from './effect.js'
import type { DistortionParams } from '../../types.js'

export class DistortionEffect {
  readonly slot: EffectSlot
  private readonly ctx: BaseAudioContext
  private readonly shaper: WaveShaperNode
  private readonly toneFilter: BiquadFilterNode

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx

    this.shaper = ctx.createWaveShaper()
    this.shaper.oversample = '4x'
    this.shaper.curve = this.makeCurve(10) as Float32Array<ArrayBuffer>

    this.toneFilter = ctx.createBiquadFilter()
    this.toneFilter.type = 'lowpass'
    this.toneFilter.frequency.value = 4000

    this.shaper.connect(this.toneFilter)

    this.slot = new EffectSlot(ctx, this.shaper, this.toneFilter)
  }

  get input(): AudioNode { return this.slot.input }
  get output(): AudioNode { return this.slot.output }

  update(p: Partial<DistortionParams>): void {
    if (p.enabled !== undefined) this.slot.enabled = p.enabled
    if (p.mix !== undefined) this.slot.mix = p.mix
    if (p.drive !== undefined) {
      this.shaper.curve = this.makeCurve(p.drive) as Float32Array<ArrayBuffer>
    }
    if (p.tone !== undefined) {
      this.toneFilter.frequency.setTargetAtTime(p.tone, this.ctx.currentTime, 0.02)
    }
  }

  private makeCurve(drive: number): Float32Array {
    const samples = 1024
    const curve = new Float32Array(samples)
    const k = drive
    const tanhK = Math.tanh(k)
    for (let i = 0; i < samples; i++) {
      const x = (2 * i) / (samples - 1) - 1
      curve[i] = Math.tanh(k * x) / tanhK
    }
    return curve
  }
}
