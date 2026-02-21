import { DistortionEffect } from './effects/distortion.js'
import { ChorusEffect } from './effects/chorus.js'
import { ReverbEffect } from './effects/reverb.js'
import { EQEffect } from './effects/eq.js'
import type { EffectsParamsUpdate } from '../types.js'

export class EffectsChain {
  readonly input: GainNode
  readonly output: GainNode
  private readonly distortion: DistortionEffect
  private readonly chorus: ChorusEffect
  private readonly reverb: ReverbEffect
  private readonly eq: EQEffect

  constructor(ctx: BaseAudioContext) {
    this.input = ctx.createGain()
    this.output = ctx.createGain()

    this.distortion = new DistortionEffect(ctx)
    this.chorus = new ChorusEffect(ctx)
    this.reverb = new ReverbEffect(ctx)
    this.eq = new EQEffect(ctx)

    // Wire in series: input → eq → distortion → chorus → reverb → output
    this.input.connect(this.eq.input)
    this.eq.output.connect(this.distortion.input)
    this.distortion.output.connect(this.chorus.input)
    this.chorus.output.connect(this.reverb.input)
    this.reverb.output.connect(this.output)
  }

  updateParams(update: EffectsParamsUpdate): void {
    if (update.distortion) this.distortion.update(update.distortion)
    if (update.chorus) this.chorus.update(update.chorus)
    if (update.reverb) this.reverb.update(update.reverb)
    if (update.eq) this.eq.update(update.eq)
  }
}
