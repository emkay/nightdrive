import { Voice } from './voice.js'
import { type VoiceParamsUpdate, midiToFreq } from '../types.js'

/**
 * Manages a pool of Voice instances for polyphony.
 * Uses oldest-note-first voice stealing when the pool is exhausted.
 */
export class VoiceAllocator {
  private voices: Voice[]

  constructor(
    private ctx: AudioContext,
    private destination: AudioNode,
    polyphony: number = 8,
  ) {
    this.voices = Array.from({ length: polyphony }, () => new Voice(ctx, destination))
  }

  noteOn(note: number, velocity: number): void {
    const freq = midiToFreq(note)
    const voice = this.allocate(note)
    voice.noteOn(freq, velocity, note)
  }

  noteOff(note: number): void {
    for (const voice of this.voices) {
      if (voice.currentNote === note && voice.state === 'active') {
        voice.noteOff()
        return
      }
    }
  }

  /** Update params on all voices. */
  updateParams(update: VoiceParamsUpdate): void {
    for (const voice of this.voices) {
      voice.updateParams(update)
    }
  }

  private allocate(note: number): Voice {
    // First: reuse a voice already playing this note
    for (const voice of this.voices) {
      if (voice.currentNote === note) return voice
    }

    // Second: find an idle voice
    for (const voice of this.voices) {
      if (voice.state === 'idle') return voice
    }

    // Third: find a releasing voice (oldest first)
    let oldest: Voice | null = null
    for (const voice of this.voices) {
      if (voice.state === 'releasing') {
        if (!oldest || voice.startedAt < oldest.startedAt) {
          oldest = voice
        }
      }
    }
    if (oldest) return oldest

    // Last resort: steal the oldest active voice
    oldest = this.voices[0]
    for (const voice of this.voices) {
      if (voice.startedAt < oldest.startedAt) {
        oldest = voice
      }
    }
    return oldest
  }

  dispose(): void {
    for (const voice of this.voices) {
      voice.dispose()
    }
  }
}
