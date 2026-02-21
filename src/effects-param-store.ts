import {
  type EffectsParams,
  type EffectsParamsUpdate,
  type ReverbParams,
  type DistortionParams,
  type ChorusParams,
  type EQParams,
  DEFAULT_EFFECTS_PARAMS,
} from './types.js'

export class EffectsParamStore extends EventTarget {
  private _params: EffectsParams

  constructor() {
    super()
    this._params = {
      reverb: { ...DEFAULT_EFFECTS_PARAMS.reverb },
      distortion: { ...DEFAULT_EFFECTS_PARAMS.distortion },
      chorus: { ...DEFAULT_EFFECTS_PARAMS.chorus },
      eq: { ...DEFAULT_EFFECTS_PARAMS.eq },
    }
  }

  get reverb(): ReverbParams { return this._params.reverb }
  get distortion(): DistortionParams { return this._params.distortion }
  get chorus(): ChorusParams { return this._params.chorus }
  get eq(): EQParams { return this._params.eq }

  update(update: EffectsParamsUpdate): void {
    if (update.reverb) Object.assign(this._params.reverb, update.reverb)
    if (update.distortion) Object.assign(this._params.distortion, update.distortion)
    if (update.chorus) Object.assign(this._params.chorus, update.chorus)
    if (update.eq) Object.assign(this._params.eq, update.eq)
    this.dispatchEvent(new CustomEvent('change', { detail: update }))
  }
}
