import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { theme, panelStyles } from '../styles/theme.js';
import { AudioEngine } from '../audio/engine.js';
import { VoiceAllocator } from '../audio/voice-allocator.js';
import { MidiAccess } from '../midi/midi-access.js';
import { MidiHandler } from '../midi/midi-handler.js';
import type { NoteEvent, OscType, FilterType, ADSRParams } from '../types.js';
import type { NdKeyboard } from './nd-keyboard.js';

@customElement('nd-app')
export class NdApp extends LitElement {
  static override styles = [
    theme,
    panelStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--nd-bg);
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        border-bottom: 1px solid var(--nd-border);
      }

      .title {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: lowercase;
        color: var(--nd-accent);
      }

      .header-controls {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .midi-status {
        font-size: 11px;
        color: var(--nd-fg-dim);
      }

      .midi-status.connected {
        color: var(--nd-accent);
      }

      .params {
        display: flex;
        gap: 12px;
        padding: 16px 20px;
        flex-wrap: wrap;
      }

      .keyboard-container {
        margin-top: auto;
        padding: 0 20px 20px;
      }

      .start-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.8);
        z-index: 100;
        cursor: pointer;
      }

      .start-overlay span {
        font-size: 20px;
        color: var(--nd-accent);
        letter-spacing: 2px;
      }
    `,
  ];

  private engine: AudioEngine | null = null;
  private allocator: VoiceAllocator | null = null;
  private midiAccess = new MidiAccess();
  private midiHandler = new MidiHandler();

  @state() private started = false;
  @state() private midiConnected = false;
  @state() private volume = 70;

  @query('nd-keyboard') private keyboard!: NdKeyboard;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupMidi();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.allocator?.dispose();
    this.midiHandler.dispose();
    this.engine = null;
    this.allocator = null;
  }

  override render() {
    return html`
      ${!this.started
        ? html`<div class="start-overlay" @click=${this.start}>
            <span>click to start</span>
          </div>`
        : ''}

      <header>
        <span class="title">nightdrive</span>
        <div class="header-controls">
          <span class="midi-status ${this.midiConnected ? 'connected' : ''}">
            ${this.midiConnected ? 'MIDI connected' : 'No MIDI'}
          </span>
          <nd-knob
            label="VOL"
            .min=${0}
            .max=${100}
            .value=${this.volume}
            value-format="percent"
            @input=${this.onVolumeChange}
          ></nd-knob>
        </div>
      </header>

      <section class="params">
        <nd-oscillator @osc-change=${this.onOscChange}></nd-oscillator>
        <nd-filter @filter-change=${this.onFilterChange}></nd-filter>
        <nd-envelope @envelope-change=${this.onEnvelopeChange}></nd-envelope>
      </section>

      <section class="keyboard-container">
        <nd-keyboard
          @note-on=${this.onNoteOn}
          @note-off=${this.onNoteOff}
        ></nd-keyboard>
      </section>
    `;
  }

  private async start(): Promise<void> {
    if (!this.engine) {
      this.engine = new AudioEngine();
      this.allocator = new VoiceAllocator(this.engine.ctx, this.engine.destination);
    }
    await this.engine.start();
    this.started = true;
  }

  private async setupMidi(): Promise<void> {
    const ok = await this.midiAccess.request();
    if (!ok) return;

    this.midiAccess.addEventListener('inputs-changed', () => {
      const inputs = this.midiAccess.inputs;
      this.midiHandler.attachAll(inputs);
      this.midiConnected = inputs.length > 0;
    });

    this.midiHandler.attachAll(this.midiAccess.inputs);
    this.midiConnected = this.midiAccess.inputs.length > 0;

    this.midiHandler.addEventListener('note-on', ((e: CustomEvent<NoteEvent>) => {
      if (!this.started) this.start();
      this.allocator?.noteOn(e.detail.note, e.detail.velocity);
      this.keyboard?.setNoteActive(e.detail.note, true);
    }) as EventListener);

    this.midiHandler.addEventListener('note-off', ((e: CustomEvent<NoteEvent>) => {
      this.allocator?.noteOff(e.detail.note);
      this.keyboard?.setNoteActive(e.detail.note, false);
    }) as EventListener);
  }

  private onNoteOn(e: CustomEvent<NoteEvent>): void {
    if (!this.started) this.start();
    this.allocator?.noteOn(e.detail.note, e.detail.velocity);
  }

  private onNoteOff(e: CustomEvent<NoteEvent>): void {
    this.allocator?.noteOff(e.detail.note);
  }

  private onVolumeChange(e: CustomEvent<number>): void {
    this.volume = e.detail;
    this.engine?.setMasterVolume(e.detail / 100);
  }

  private onOscChange(e: CustomEvent<{ oscType?: OscType; detune?: number }>): void {
    this.allocator?.updateParams(e.detail);
  }

  private onFilterChange(e: CustomEvent<{ filterType?: FilterType; filterCutoff?: number; filterQ?: number }>): void {
    this.allocator?.updateParams(e.detail);
  }

  private onEnvelopeChange(e: CustomEvent<{ envelope: ADSRParams }>): void {
    this.allocator?.updateParams(e.detail);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-app': NdApp;
  }
}
