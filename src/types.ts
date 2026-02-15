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
};

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

/** Convert MIDI note number to frequency in Hz. */
export function midiToFreq(note: number): number {
  const n = Math.max(0, Math.min(127, note));
  return 440 * Math.pow(2, (n - 69) / 12);
}
