/**
 * EffectSlot — reusable dry/wet routing wrapper.
 *
 *       input
 *      /     \
 *  dryGain   processingIn → ... → processingOut → wetGain
 *      \     /
 *      output   (Web Audio sums automatically)
 */
export class EffectSlot {
  readonly input: GainNode
  readonly output: GainNode
  private readonly dryGain: GainNode
  private readonly wetGain: GainNode
  private _enabled = false
  private _mix = 0.5

  constructor(
    ctx: BaseAudioContext,
    processingIn: AudioNode,
    processingOut: AudioNode,
  ) {
    this.input = ctx.createGain()
    this.output = ctx.createGain()
    this.dryGain = ctx.createGain()
    this.wetGain = ctx.createGain()

    // dry path
    this.input.connect(this.dryGain)
    this.dryGain.connect(this.output)

    // wet path
    this.input.connect(processingIn)
    processingOut.connect(this.wetGain)
    this.wetGain.connect(this.output)

    // start bypassed
    this.dryGain.gain.value = 1
    this.wetGain.gain.value = 0
  }

  get enabled(): boolean { return this._enabled }
  set enabled(v: boolean) {
    this._enabled = v
    this.applyMix()
  }

  get mix(): number { return this._mix }
  set mix(v: number) {
    this._mix = v
    if (this._enabled) this.applyMix()
  }

  private applyMix(): void {
    const t = this.input.context.currentTime
    const wet = this._enabled ? this._mix : 0
    const dry = this._enabled ? 1 - this._mix : 1
    this.wetGain.gain.setTargetAtTime(wet, t, 0.02)
    this.dryGain.gain.setTargetAtTime(dry, t, 0.02)
  }
}
