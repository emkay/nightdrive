import { type VoiceParams, type VoiceParamsUpdate, type OscParams, type ADSRParams, DEFAULT_VOICE_PARAMS } from '../types.js';

export type VoiceState = 'idle' | 'active' | 'releasing';

function deepCopyParams(p: VoiceParams): VoiceParams {
  return {
    osc1: { ...p.osc1, envelope: { ...p.osc1.envelope } },
    osc2: { ...p.osc2, envelope: { ...p.osc2.envelope } },
  };
}

export class Voice {
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;

  // Per-oscillator persistent nodes
  private filter1: BiquadFilterNode;
  private envGain1: GainNode;
  private volGain1: GainNode;

  private filter2: BiquadFilterNode;
  private envGain2: GainNode;
  private volGain2: GainNode;

  private ctx: AudioContext;
  private destination: AudioNode;

  state: VoiceState = 'idle';
  currentNote: number = -1;
  startedAt: number = 0;

  params: VoiceParams = deepCopyParams(DEFAULT_VOICE_PARAMS);

  private releaseTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;

    // Osc1 chain: filter1 → envGain1 → volGain1 → destination
    this.filter1 = ctx.createBiquadFilter();
    this.envGain1 = ctx.createGain();
    this.volGain1 = ctx.createGain();
    this.applyFilterParams(this.filter1, this.params.osc1);
    this.envGain1.gain.value = 0;
    this.volGain1.gain.value = this.params.osc1.volume;
    this.filter1.connect(this.envGain1);
    this.envGain1.connect(this.volGain1);
    this.volGain1.connect(this.destination);

    // Osc2 chain: filter2 → envGain2 → volGain2 → destination
    this.filter2 = ctx.createBiquadFilter();
    this.envGain2 = ctx.createGain();
    this.volGain2 = ctx.createGain();
    this.applyFilterParams(this.filter2, this.params.osc2);
    this.envGain2.gain.value = 0;
    this.volGain2.gain.value = this.params.osc2.volume;
    this.filter2.connect(this.envGain2);
    this.envGain2.connect(this.volGain2);
    this.volGain2.connect(this.destination);
  }

  noteOn(frequency: number, velocity: number, note: number): void {
    const wasActive = this.state !== 'idle';
    this.stopOsc();
    if (this.releaseTimeout !== null) {
      clearTimeout(this.releaseTimeout);
      this.releaseTimeout = null;
    }

    const now = this.ctx.currentTime;
    const amp = velocity / 127;

    // Osc1
    if (this.params.osc1.enabled) {
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = this.params.osc1.type;
      this.osc1.frequency.value = frequency;
      this.osc1.detune.value = this.params.osc1.detune;
      this.osc1.connect(this.filter1);
      this.osc1.start(now);
      this.applyFilterParams(this.filter1, this.params.osc1);
      this.applyEnvelope(this.envGain1, this.params.osc1.envelope, amp, wasActive, now);
    } else {
      // Silence this chain
      this.envGain1.gain.cancelScheduledValues(now);
      this.envGain1.gain.setValueAtTime(0, now);
    }

    // Osc2
    if (this.params.osc2.enabled) {
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = this.params.osc2.type;
      this.osc2.frequency.value = frequency;
      this.osc2.detune.value = this.params.osc2.detune;
      this.osc2.connect(this.filter2);
      this.osc2.start(now);
      this.applyFilterParams(this.filter2, this.params.osc2);
      this.applyEnvelope(this.envGain2, this.params.osc2.envelope, amp, wasActive, now);
    } else {
      this.envGain2.gain.cancelScheduledValues(now);
      this.envGain2.gain.setValueAtTime(0, now);
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

    // Release osc1
    if (this.osc1) {
      this.envGain1.gain.cancelScheduledValues(now);
      this.envGain1.gain.setValueAtTime(this.envGain1.gain.value, now);
      this.envGain1.gain.linearRampToValueAtTime(0, now + release1);
      try { this.osc1.stop(now + release1); } catch {}
    }

    // Release osc2
    if (this.osc2) {
      this.envGain2.gain.cancelScheduledValues(now);
      this.envGain2.gain.setValueAtTime(this.envGain2.gain.value, now);
      this.envGain2.gain.linearRampToValueAtTime(0, now + release2);
      try { this.osc2.stop(now + release2); } catch {}
    }

    this.state = 'releasing';

    this.releaseTimeout = setTimeout(() => {
      if (this.state === 'releasing') {
        this.disconnectOsc(1);
        this.disconnectOsc(2);
        this.state = 'idle';
        this.currentNote = -1;
      }
      this.releaseTimeout = null;
    }, maxRelease * 1000 + 100);
  }

  updateParams(update: VoiceParamsUpdate): void {
    if (update.osc1) this.applyOscUpdate(1, update.osc1);
    if (update.osc2) this.applyOscUpdate(2, update.osc2);
  }

  private applyOscUpdate(index: 1 | 2, partial: Partial<OscParams>): void {
    const p = index === 1 ? this.params.osc1 : this.params.osc2;
    const osc = index === 1 ? this.osc1 : this.osc2;
    const filter = index === 1 ? this.filter1 : this.filter2;
    const volGain = index === 1 ? this.volGain1 : this.volGain2;
    const now = this.ctx.currentTime;

    if (partial.type !== undefined) {
      p.type = partial.type;
      if (osc) osc.type = partial.type;
    }
    if (partial.detune !== undefined) {
      p.detune = partial.detune;
      if (osc) osc.detune.setTargetAtTime(partial.detune, now, 0.005);
    }
    if (partial.enabled !== undefined) {
      p.enabled = partial.enabled;
    }
    if (partial.volume !== undefined) {
      p.volume = partial.volume;
      volGain.gain.setTargetAtTime(partial.volume, now, 0.005);
    }
    if (partial.filterType !== undefined) {
      p.filterType = partial.filterType;
      filter.type = partial.filterType;
    }
    if (partial.filterCutoff !== undefined) {
      p.filterCutoff = partial.filterCutoff;
      filter.frequency.setTargetAtTime(partial.filterCutoff, now, 0.005);
    }
    if (partial.filterQ !== undefined) {
      p.filterQ = partial.filterQ;
      filter.Q.setTargetAtTime(partial.filterQ, now, 0.005);
    }
    if (partial.envelope) {
      Object.assign(p.envelope, partial.envelope);
    }
  }

  private applyEnvelope(gain: GainNode, env: ADSRParams, amp: number, wasActive: boolean, now: number): void {
    const { attack, decay, sustain } = env;
    const fadeTime = wasActive ? 0.002 : 0;
    gain.gain.cancelScheduledValues(now);
    if (wasActive) {
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + fadeTime);
    } else {
      gain.gain.setValueAtTime(0, now);
    }
    gain.gain.linearRampToValueAtTime(amp, now + fadeTime + attack);
    gain.gain.linearRampToValueAtTime(amp * sustain, now + fadeTime + attack + decay);
  }

  private applyFilterParams(filter: BiquadFilterNode, p: OscParams): void {
    filter.type = p.filterType;
    filter.frequency.value = p.filterCutoff;
    filter.Q.value = p.filterQ;
  }

  private disconnectOsc(num: 1 | 2): void {
    const osc = num === 1 ? this.osc1 : this.osc2;
    if (osc) {
      try { osc.disconnect(); } catch {}
      if (num === 1) this.osc1 = null;
      else this.osc2 = null;
    }
  }

  private stopOsc(): void {
    for (const osc of [this.osc1, this.osc2]) {
      if (osc) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      }
    }
    this.osc1 = null;
    this.osc2 = null;
  }

  dispose(): void {
    this.stopOsc();
    if (this.releaseTimeout !== null) clearTimeout(this.releaseTimeout);
    this.filter1.disconnect();
    this.envGain1.disconnect();
    this.volGain1.disconnect();
    this.filter2.disconnect();
    this.envGain2.disconnect();
    this.volGain2.disconnect();
  }
}
