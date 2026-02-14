export type OscType = 'sine' | 'sawtooth' | 'square' | 'triangle';

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export interface ADSRParams {
  attack: number;   // seconds
  decay: number;    // seconds
  sustain: number;  // 0–1
  release: number;  // seconds
}

export interface VoiceParams {
  oscType: OscType;
  detune: number;          // cents
  filterType: FilterType;
  filterCutoff: number;    // Hz
  filterQ: number;         // 0–30
  envelope: ADSRParams;
}

export const DEFAULT_VOICE_PARAMS: VoiceParams = {
  oscType: 'sawtooth',
  detune: 0,
  filterType: 'lowpass',
  filterCutoff: 2000,
  filterQ: 5,
  envelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.6,
    release: 0.3,
  },
};

export interface NoteEvent {
  note: number;
  velocity: number;
}

export interface CCEvent {
  controller: number;
  value: number;
}

/** Convert MIDI note number to frequency in Hz. */
export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}
