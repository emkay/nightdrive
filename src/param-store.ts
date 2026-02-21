import { type VoiceParams, type VoiceParamsUpdate, type OscParams, DEFAULT_VOICE_PARAMS } from './types.js'

function deepCopyOsc(p: OscParams): OscParams {
  return { ...p, envelope: { ...p.envelope } }
}

/**
 * Central source of truth for synth voice parameters.
 * UI writes to it, audio layer subscribes to it.
 */
export class ParamStore extends EventTarget {
  private _params: VoiceParams

  constructor() {
    super()
    this._params = {
      osc1: deepCopyOsc(DEFAULT_VOICE_PARAMS.osc1),
      osc2: deepCopyOsc(DEFAULT_VOICE_PARAMS.osc2),
    }
  }

  get params(): VoiceParams {
    return this._params
  }

  get osc1(): OscParams {
    return this._params.osc1
  }

  get osc2(): OscParams {
    return this._params.osc2
  }

  update(update: VoiceParamsUpdate): void {
    if (update.osc1) this.mergeOsc(this._params.osc1, update.osc1)
    if (update.osc2) this.mergeOsc(this._params.osc2, update.osc2)
    this.dispatchEvent(new CustomEvent('change', { detail: update }))
  }

  private mergeOsc(target: OscParams, partial: Partial<OscParams>): void {
    if (partial.type !== undefined) target.type = partial.type
    if (partial.detune !== undefined) target.detune = partial.detune
    if (partial.enabled !== undefined) target.enabled = partial.enabled
    if (partial.volume !== undefined) target.volume = partial.volume
    if (partial.filterType !== undefined) target.filterType = partial.filterType
    if (partial.filterCutoff !== undefined) target.filterCutoff = partial.filterCutoff
    if (partial.filterQ !== undefined) target.filterQ = partial.filterQ
    if (partial.envelope) Object.assign(target.envelope, partial.envelope)
  }
}
