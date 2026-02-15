import { type VoiceParams, type VoiceParamsUpdate, type OscParams, type ADSRParams, DEFAULT_VOICE_PARAMS } from '../types.js';

export type VoiceState = 'idle' | 'active' | 'releasing';

function deepCopyOsc(p: OscParams): OscParams {
  return { ...p, envelope: { ...p.envelope } };
}

function deepCopyParams(p: VoiceParams): VoiceParams {
  return { osc1: deepCopyOsc(p.osc1), osc2: deepCopyOsc(p.osc2) };
}

/**
 * One oscillator sub-chain: Osc → Filter → envGain → volGain → destination.
 * Filter, envGain, and volGain are persistent; OscillatorNode is transient.
 */
class OscillatorChain {
  osc: OscillatorNode | null = null;
  readonly filter: BiquadFilterNode;
  readonly envGain: GainNode;
  readonly volGain: GainNode;

  constructor(private ctx: AudioContext, destination: AudioNode, params: OscParams) {
    this.filter = ctx.createBiquadFilter();
    this.envGain = ctx.createGain();
    this.volGain = ctx.createGain();

    this.filter.type = params.filterType;
    this.filter.frequency.value = params.filterCutoff;
    this.filter.Q.value = params.filterQ;
    this.envGain.gain.value = 0;
    this.volGain.gain.value = params.volume;

    this.filter.connect(this.envGain);
    this.envGain.connect(this.volGain);
    this.volGain.connect(destination);
  }

  startOsc(params: OscParams, frequency: number, amp: number, wasActive: boolean, now: number): void {
    this.osc = this.ctx.createOscillator();
    this.osc.type = params.type;
    this.osc.frequency.value = frequency;
    this.osc.detune.value = params.detune;
    this.osc.connect(this.filter);
    this.osc.start(now);

    this.filter.type = params.filterType;
    this.filter.frequency.value = params.filterCutoff;
    this.filter.Q.value = params.filterQ;

    this.applyEnvelope(params.envelope, amp, wasActive, now);
  }

  silence(now: number): void {
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(0, now);
  }

  release(releaseTime: number, now: number): void {
    if (!this.osc) return;
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(this.envGain.gain.value, now);
    this.envGain.gain.linearRampToValueAtTime(0, now + releaseTime);
    try { this.osc.stop(now + releaseTime); } catch {}
  }

  applyEnvelope(env: ADSRParams, amp: number, wasActive: boolean, now: number): void {
    const { attack, decay, sustain } = env;
    const fadeTime = wasActive ? 0.002 : 0;
    this.envGain.gain.cancelScheduledValues(now);
    if (wasActive) {
      this.envGain.gain.setValueAtTime(this.envGain.gain.value, now);
      this.envGain.gain.linearRampToValueAtTime(0, now + fadeTime);
    } else {
      this.envGain.gain.setValueAtTime(0, now);
    }
    this.envGain.gain.linearRampToValueAtTime(amp, now + fadeTime + attack);
    this.envGain.gain.linearRampToValueAtTime(amp * sustain, now + fadeTime + attack + decay);
  }

  updateParams(params: OscParams, partial: Partial<OscParams>, now: number): void {
    if (partial.type !== undefined) {
      params.type = partial.type;
      if (this.osc) this.osc.type = partial.type;
    }
    if (partial.detune !== undefined) {
      params.detune = partial.detune;
      if (this.osc) this.osc.detune.setTargetAtTime(partial.detune, now, 0.005);
    }
    if (partial.volume !== undefined) {
      params.volume = partial.volume;
      this.volGain.gain.setTargetAtTime(partial.volume, now, 0.005);
    }
    if (partial.filterType !== undefined) {
      params.filterType = partial.filterType;
      this.filter.type = partial.filterType;
    }
    if (partial.filterCutoff !== undefined) {
      params.filterCutoff = partial.filterCutoff;
      this.filter.frequency.setTargetAtTime(partial.filterCutoff, now, 0.005);
    }
    if (partial.filterQ !== undefined) {
      params.filterQ = partial.filterQ;
      this.filter.Q.setTargetAtTime(partial.filterQ, now, 0.005);
    }
    if (partial.envelope) {
      Object.assign(params.envelope, partial.envelope);
    }
  }

  /** Enable mid-note: create osc and ramp up. */
  enable(params: OscParams, frequency: number, amp: number, now: number): void {
    const newOsc = this.ctx.createOscillator();
    newOsc.type = params.type;
    newOsc.frequency.value = frequency;
    newOsc.detune.value = params.detune;
    newOsc.connect(this.filter);
    newOsc.start(now);
    this.osc = newOsc;
    this.applyEnvelope(params.envelope, amp, false, now);
  }

  /** Disable mid-note: ramp down and stop osc. */
  disable(now: number): void {
    this.envGain.gain.cancelScheduledValues(now);
    this.envGain.gain.setValueAtTime(this.envGain.gain.value, now);
    this.envGain.gain.linearRampToValueAtTime(0, now + 0.005);
    if (this.osc) {
      const oscRef = this.osc;
      try { oscRef.stop(now + 0.01); } catch {}
      setTimeout(() => { try { oscRef.disconnect(); } catch {} }, 20);
      this.osc = null;
    }
  }

  disconnectOsc(): void {
    if (this.osc) {
      try { this.osc.disconnect(); } catch {}
      this.osc = null;
    }
  }

  stopOsc(): void {
    if (this.osc) {
      try { this.osc.stop(); } catch {}
      try { this.osc.disconnect(); } catch {}
      this.osc = null;
    }
  }

  /** Fade-safe stop: keep old osc alive briefly so the envelope crossfade has signal. */
  stopOscGraceful(now: number): void {
    if (this.osc) {
      const oscRef = this.osc;
      try { oscRef.stop(now + 0.01); } catch {}
      setTimeout(() => { try { oscRef.disconnect(); } catch {} }, 20);
      this.osc = null;
    }
  }

  dispose(): void {
    this.stopOsc();
    this.filter.disconnect();
    this.envGain.disconnect();
    this.volGain.disconnect();
  }
}

export class Voice {
  private chain1: OscillatorChain;
  private chain2: OscillatorChain;
  private ctx: AudioContext;

  state: VoiceState = 'idle';
  currentNote: number = -1;
  startedAt: number = 0;
  private lastFrequency: number = 0;
  private lastVelocity: number = 0;

  params: VoiceParams = deepCopyParams(DEFAULT_VOICE_PARAMS);

  private releaseTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.chain1 = new OscillatorChain(ctx, destination, this.params.osc1);
    this.chain2 = new OscillatorChain(ctx, destination, this.params.osc2);
  }

  noteOn(frequency: number, velocity: number, note: number): void {
    const wasActive = this.state !== 'idle';
    const now = this.ctx.currentTime;

    // Gracefully stop old oscillators — let them ring during the
    // envelope's 2 ms fade-to-zero so there's no hard discontinuity.
    if (wasActive) {
      this.chain1.stopOscGraceful(now);
      this.chain2.stopOscGraceful(now);
    } else {
      this.chain1.stopOsc();
      this.chain2.stopOsc();
    }
    if (this.releaseTimeout !== null) {
      clearTimeout(this.releaseTimeout);
      this.releaseTimeout = null;
    }
    const amp = velocity / 127;
    this.lastFrequency = frequency;
    this.lastVelocity = velocity;

    if (this.params.osc1.enabled) {
      this.chain1.startOsc(this.params.osc1, frequency, amp, wasActive, now);
    } else {
      this.chain1.silence(now);
    }

    if (this.params.osc2.enabled) {
      this.chain2.startOsc(this.params.osc2, frequency, amp, wasActive, now);
    } else {
      this.chain2.silence(now);
    }

    this.state = 'active';
    this.currentNote = note;
    this.startedAt = now;
  }

  noteOff(): void {
    if (this.state !== 'active') return;

    const now = this.ctx.currentTime;
    const release1 = this.params.osc1.envelope.release;
    const release2 = this.params.osc2.envelope.release;
    const maxRelease = Math.max(release1, release2);

    this.chain1.release(release1, now);
    this.chain2.release(release2, now);

    this.state = 'releasing';

    this.releaseTimeout = setTimeout(() => {
      if (this.state === 'releasing') {
        this.chain1.disconnectOsc();
        this.chain2.disconnectOsc();
        this.state = 'idle';
        this.currentNote = -1;
      }
      this.releaseTimeout = null;
    }, maxRelease * 1000 + 100);
  }

  updateParams(update: VoiceParamsUpdate): void {
    if (update.osc1) this.applyOscUpdate(this.chain1, this.params.osc1, update.osc1);
    if (update.osc2) this.applyOscUpdate(this.chain2, this.params.osc2, update.osc2);
  }

  private applyOscUpdate(chain: OscillatorChain, p: OscParams, partial: Partial<OscParams>): void {
    const now = this.ctx.currentTime;

    // Handle enable/disable toggle mid-note
    if (partial.enabled !== undefined && partial.enabled !== p.enabled) {
      p.enabled = partial.enabled;
      if (this.state === 'active') {
        if (partial.enabled) {
          chain.enable(p, this.lastFrequency, this.lastVelocity / 127, now);
        } else {
          chain.disable(now);
        }
      }
    }

    chain.updateParams(p, partial, now);
  }

  dispose(): void {
    this.chain1.dispose();
    this.chain2.dispose();
    if (this.releaseTimeout !== null) clearTimeout(this.releaseTimeout);
  }
}
