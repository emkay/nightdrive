export type OscType = 'sine' | 'sawtooth' | 'square' | 'triangle';

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface ADSRParams {
  attack: number;   // seconds
  decay: number;    // seconds
  sustain: number;  // 0–1
  release: number;  // seconds
}

export interface OscParams {
  type: OscType;
  detune: number;        // cents
  enabled: boolean;
  volume: number;        // 0–1
  filterType: FilterType;
  filterCutoff: number;  // Hz
  filterQ: number;       // 0–30
  envelope: ADSRParams;
}

export interface VoiceParams {
  osc1: OscParams;
  osc2: OscParams;
}

export type VoiceParamsUpdate = {
  osc1?: Partial<OscParams>;
  osc2?: Partial<OscParams>;
};

export const DEFAULT_VOICE_PARAMS: VoiceParams = {
  osc1: {
    type: 'sawtooth',
    detune: 0,
    enabled: true,
    volume: 0.8,
    filterType: 'lowpass',
    filterCutoff: 2000,
    filterQ: 5,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
  },
  osc2: {
    type: 'square',
    detune: 0,
    enabled: false,
    volume: 0.8,
    filterType: 'lowpass',
    filterCutoff: 2000,
    filterQ: 5,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
  },
}

export interface NoteEvent {
  note: number;
  velocity: number;
}

export interface SequencerStep {
  note: number;     // MIDI note 36–84
  velocity: number; // 0–127
}

export interface CCEvent {
  controller: number;
  value: number;
}

export interface ReverbParams {
  enabled: boolean;
  mix: number;      // 0–1
  decay: number;    // 0.1–10 seconds
  preDelay: number; // 0–0.1 seconds
}

export interface DistortionParams {
  enabled: boolean;
  mix: number;   // 0–1
  drive: number; // 1–100
  tone: number;  // 200–8000 Hz
}

export interface ChorusParams {
  enabled: boolean;
  mix: number;   // 0–1
  rate: number;  // 0.1–10 Hz
  depth: number; // 0–1
  delay: number; // 5–30 ms
}

export interface EQParams {
  enabled: boolean;
  lowGain: number;  // -12–+12 dB
  midGain: number;  // -12–+12 dB
  midFreq: number;  // 200–8000 Hz
  highGain: number; // -12–+12 dB
}

export interface EffectsParams {
  reverb: ReverbParams;
  distortion: DistortionParams;
  chorus: ChorusParams;
  eq: EQParams;
}

export type EffectsParamsUpdate = {
  reverb?: Partial<ReverbParams>;
  distortion?: Partial<DistortionParams>;
  chorus?: Partial<ChorusParams>;
  eq?: Partial<EQParams>;
}

export const DEFAULT_EFFECTS_PARAMS: EffectsParams = {
  reverb: { enabled: false, mix: 0.3, decay: 2, preDelay: 0.02 },
  distortion: { enabled: false, mix: 0.5, drive: 10, tone: 4000 },
  chorus: { enabled: false, mix: 0.5, rate: 1.5, depth: 0.5, delay: 15 },
  eq: { enabled: true, lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0 },
}

/** Convert MIDI note number to frequency in Hz. */
export function midiToFreq(note: number): number {
  const n = Math.max(0, Math.min(127, note))
  return 440 * Math.pow(2, (n - 69) / 12)
}
