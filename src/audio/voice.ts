import { type VoiceParams, DEFAULT_VOICE_PARAMS } from '../types.js';

export type VoiceState = 'idle' | 'active' | 'releasing';

export class Voice {
  private osc: OscillatorNode | null = null;
  private filter: BiquadFilterNode;
  private gain: GainNode;
  private ctx: AudioContext;
  private destination: AudioNode;

  state: VoiceState = 'idle';
  currentNote: number = -1;
  startedAt: number = 0;

  params: VoiceParams = { ...DEFAULT_VOICE_PARAMS, envelope: { ...DEFAULT_VOICE_PARAMS.envelope } };

  private releaseTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = this.params.filterType;
    this.filter.frequency.value = this.params.filterCutoff;
    this.filter.Q.value = this.params.filterQ;

    this.gain = ctx.createGain();
    this.gain.gain.value = 0;

    this.filter.connect(this.gain);
    this.gain.connect(this.destination);
  }

  noteOn(frequency: number, velocity: number, note: number): void {
    const wasActive = this.state !== 'idle';
    this.stopOsc();
    if (this.releaseTimeout !== null) {
      clearTimeout(this.releaseTimeout);
      this.releaseTimeout = null;
    }

    const now = this.ctx.currentTime;
    const { attack, decay, sustain } = this.params.envelope;
    const amp = velocity / 127;

    this.osc = this.ctx.createOscillator();
    this.osc.type = this.params.oscType;
    this.osc.frequency.value = frequency;
    this.osc.detune.value = this.params.detune;
    this.osc.connect(this.filter);
    this.osc.start(now);

    this.filter.type = this.params.filterType;
    this.filter.frequency.setTargetAtTime(this.params.filterCutoff, now, 0.005);
    this.filter.Q.setTargetAtTime(this.params.filterQ, now, 0.005);

    // Brief fade when stealing to avoid click, immediate start otherwise
    const fadeTime = wasActive ? 0.002 : 0;
    this.gain.gain.cancelAndHoldAtTime(now);
    if (wasActive) {
      this.gain.gain.linearRampToValueAtTime(0, now + fadeTime);
    } else {
      this.gain.gain.setValueAtTime(0, now);
    }
    this.gain.gain.linearRampToValueAtTime(amp, now + fadeTime + attack);
    this.gain.gain.linearRampToValueAtTime(amp * sustain, now + fadeTime + attack + decay);

    this.state = 'active';
    this.currentNote = note;
    this.startedAt = now;
  }

  noteOff(): void {
    if (this.state !== 'active') return;

    const now = this.ctx.currentTime;
    const { release } = this.params.envelope;

    this.gain.gain.cancelAndHoldAtTime(now);
    this.gain.gain.linearRampToValueAtTime(0, now + release);

    this.state = 'releasing';

    if (this.osc) {
      try { this.osc.stop(now + release); } catch {}
    }

    this.releaseTimeout = setTimeout(() => {
      if (this.state === 'releasing') {
        if (this.osc) {
          try { this.osc.disconnect(); } catch {}
          this.osc = null;
        }
        this.state = 'idle';
        this.currentNote = -1;
      }
      this.releaseTimeout = null;
    }, release * 1000 + 100);
  }

  updateParams(params: Partial<VoiceParams>): void {
    if (params.oscType !== undefined) {
      this.params.oscType = params.oscType;
      if (this.osc) this.osc.type = params.oscType;
    }
    if (params.detune !== undefined) {
      this.params.detune = params.detune;
      if (this.osc) this.osc.detune.setTargetAtTime(params.detune, this.ctx.currentTime, 0.005);
    }
    if (params.filterType !== undefined) {
      this.params.filterType = params.filterType;
      this.filter.type = params.filterType;
    }
    if (params.filterCutoff !== undefined) {
      this.params.filterCutoff = params.filterCutoff;
      this.filter.frequency.setTargetAtTime(params.filterCutoff, this.ctx.currentTime, 0.005);
    }
    if (params.filterQ !== undefined) {
      this.params.filterQ = params.filterQ;
      this.filter.Q.setTargetAtTime(params.filterQ, this.ctx.currentTime, 0.005);
    }
    if (params.envelope) {
      Object.assign(this.params.envelope, params.envelope);
    }
  }

  private stopOsc(): void {
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch {}
      this.osc = null;
    }
  }

  dispose(): void {
    this.stopOsc();
    if (this.releaseTimeout !== null) clearTimeout(this.releaseTimeout);
    this.gain.disconnect();
    this.filter.disconnect();
  }
}
