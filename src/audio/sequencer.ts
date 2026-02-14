import type { SequencerStep } from '../types.js';
import type { VoiceAllocator } from './voice-allocator.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiNoteName(note: number): string {
  const name = NOTE_NAMES[note % 12];
  const octave = Math.floor(note / 12) - 1;
  return `${name}${octave}`;
}

/**
 * 8-step sequencer with Web Audio lookahead scheduling.
 */
export class StepSequencer extends EventTarget {
  steps: SequencerStep[];
  private _bpm = 120;
  private _playing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private activeNote: number | null = null;
  private noteOffTime = 0;

  constructor(private allocator: VoiceAllocator, private ctx: AudioContext) {
    super();
    // Default: C major scale starting at C4
    const cMajor = [60, 62, 64, 65, 67, 69, 71, 72];
    this.steps = cMajor.map(note => ({ note, velocity: 100 }));
  }

  get bpm(): number { return this._bpm; }
  set bpm(value: number) { this._bpm = Math.max(60, Math.min(240, value)); }

  get isPlaying(): boolean { return this._playing; }

  get stepIndex(): number { return this.currentStep; }

  private get stepDuration(): number {
    return 60 / this._bpm / 2; // eighth note = half a beat
  }

  start(): void {
    if (this._playing) return;
    this._playing = true;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05; // small initial delay
    this.activeNote = null;
    this.intervalId = setInterval(() => this.schedule(), 25);
  }

  stop(): void {
    if (!this._playing) return;
    this._playing = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Release any held note
    if (this.activeNote !== null) {
      this.allocator.noteOff(this.activeNote);
      this.activeNote = null;
    }
    this.dispatchEvent(new CustomEvent('step-change', { detail: -1 }));
  }

  dispose(): void {
    this.stop();
  }

  private schedule(): void {
    const lookahead = 0.1; // 100ms
    while (this.nextStepTime < this.ctx.currentTime + lookahead) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepDuration;
      this.currentStep = (this.currentStep + 1) % this.steps.length;
    }
  }

  private scheduleStep(stepIndex: number, time: number): void {
    const step = this.steps[stepIndex];
    const noteDuration = this.stepDuration * 0.8;

    // Schedule note-on/off using setTimeout aligned to audio time
    const onDelay = Math.max(0, (time - this.ctx.currentTime) * 1000);
    const offDelay = Math.max(0, (time + noteDuration - this.ctx.currentTime) * 1000);

    setTimeout(() => {
      // Turn off previous note if still active
      if (this.activeNote !== null) {
        this.allocator.noteOff(this.activeNote);
      }
      if (step.velocity > 0) {
        this.allocator.noteOn(step.note, step.velocity);
        this.activeNote = step.note;
      } else {
        this.activeNote = null;
      }
      this.dispatchEvent(new CustomEvent('step-change', { detail: stepIndex }));
    }, onDelay);

    setTimeout(() => {
      if (this.activeNote === step.note) {
        this.allocator.noteOff(step.note);
        this.activeNote = null;
      }
    }, offDelay);
  }
}
