import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { theme, panelStyles } from '../styles/theme.js';
import { AudioEngine } from '../audio/engine.js';
import { VoiceAllocator } from '../audio/voice-allocator.js';
import { StepSequencer } from '../audio/sequencer.js';
import { MidiAccess } from '../midi/midi-access.js';
import { MidiHandler } from '../midi/midi-handler.js';
import { ParamStore } from '../param-store.js';
import { EffectsParamStore } from '../effects-param-store.js';
import type { NoteEvent, FilterType, ADSRParams, VoiceParamsUpdate, EffectsParamsUpdate, ReverbParams, DistortionParams, ChorusParams, EQParams } from '../types.js';
import type { OscChangeDetail } from './nd-oscillator.js';
import type { NdKeyboard } from './nd-keyboard.js';
import './nd-tooltip.js';

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

      .help-btn {
        background: none;
        border: 1px solid var(--nd-border);
        border-radius: 4px;
        color: var(--nd-fg-dim);
        font-size: 13px;
        font-family: var(--nd-font-mono);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.1s;
      }

      .help-btn:hover {
        border-color: var(--nd-accent);
        color: var(--nd-fg);
      }

      .help-btn.active {
        background: var(--nd-accent);
        color: var(--nd-bg);
        border-color: var(--nd-accent);
      }

      .params {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 20px;
      }

      .osc-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .tab-bar {
        display: flex;
        gap: 0;
        padding: 0 20px;
        border-bottom: 1px solid var(--nd-border);
      }

      .tab {
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--nd-fg-dim);
        padding: 8px 16px;
        font-size: 11px;
        font-family: var(--nd-font-mono);
        letter-spacing: 1px;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.1s;
      }

      .tab:hover {
        color: var(--nd-fg);
      }

      .tab.active {
        color: var(--nd-accent);
        border-bottom-color: var(--nd-accent);
      }

      .keyboard-container {
        margin-top: auto;
        padding: 0 20px 20px;
      }

      .sequencer-container {
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
  private sequencer: StepSequencer | null = null;
  private midiAccess = new MidiAccess();
  private midiHandler = new MidiHandler();
  private store = new ParamStore();
  private effectsStore = new EffectsParamStore();

  // Lower row: Z–M = C3–B3, sharps on S/D/G/H/J
  // Upper row: Q–U = C4–B4, sharps on 2/3/5/6/7
  private static readonly KEY_MAP: Record<string, number> = {
    z: 48, s: 49, x: 50, d: 51, c: 52, v: 53, g: 54,
    b: 55, h: 56, n: 57, j: 58, m: 59,
    q: 60, 2: 61, w: 62, 3: 63, e: 64, r: 65, 5: 66,
    t: 67, 6: 68, y: 69, 7: 70, u: 71,
  };
  private heldKeys = new Set<string>();

  @state() private started = false;
  @state() private midiConnected = false;
  @state() private volume = 70;
  @state() private activeTab: 'keyboard' | 'sequencer' = 'keyboard';
  @state() private helpMode = false;
  @state() private showVisualizers = false;
  @state() private drawerOpen = false;
  @state() private paramVersion = 0;
  @state() private fxParamVersion = 0;

  @query('nd-keyboard') private keyboard!: NdKeyboard;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setupMidi();
    this.store.addEventListener('change', this.onStoreChange);
    this.effectsStore.addEventListener('change', this.onEffectsStoreChange);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.store.removeEventListener('change', this.onStoreChange);
    this.effectsStore.removeEventListener('change', this.onEffectsStoreChange);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.sequencer?.dispose();
    this.allocator?.dispose();
    this.midiHandler.dispose();
    this.engine = null;
    this.allocator = null;
    this.sequencer = null;
  }

  override render() {
    // Read from stores (version counters trigger re-render on changes).
    // Shallow-copy so Lit detects changes (stores mutate in place).
    void this.paramVersion;
    void this.fxParamVersion;
    const osc1 = { ...this.store.osc1, envelope: { ...this.store.osc1.envelope } };
    const osc2 = { ...this.store.osc2, envelope: { ...this.store.osc2.envelope } };
    const fxParams = {
      reverb: { ...this.effectsStore.reverb },
      distortion: { ...this.effectsStore.distortion },
      chorus: { ...this.effectsStore.chorus },
      eq: { ...this.effectsStore.eq },
    };

    return html`
      ${!this.started
        ? html`<div class="start-overlay" @click=${this.start}>
            <span>click to start</span>
          </div>`
        : ''}

      <header>
        <span class="title">nightdrive</span>
        <div class="header-controls">
          <nd-tooltip text="Connect a USB MIDI keyboard for hardware input" .active=${this.helpMode}>
            <span class="midi-status ${this.midiConnected ? 'connected' : ''}">
              ${this.midiConnected ? 'MIDI connected' : 'No MIDI'}
            </span>
          </nd-tooltip>
          <nd-tooltip text="Master output volume" .active=${this.helpMode}>
            <nd-knob
              label="VOL"
              .min=${0}
              .max=${100}
              .value=${this.volume}
              value-format="percent"
              @input=${this.onVolumeChange}
            ></nd-knob>
          </nd-tooltip>
          <button
            class="help-btn ${this.showVisualizers ? 'active' : ''}"
            @click=${() => { this.showVisualizers = !this.showVisualizers; }}
          >VIZ</button>
          <button
            class="help-btn"
            @click=${() => { this.drawerOpen = true; }}
          >FX</button>
          <button
            class="help-btn ${this.helpMode ? 'active' : ''}"
            @click=${this.toggleHelp}
          >?</button>
        </div>
      </header>

      <section class="params">
        <div class="osc-row">
          <nd-oscillator .index=${1} .params=${osc1} .help=${this.helpMode} @osc-change=${this.onOscChange}></nd-oscillator>
          <nd-filter .index=${1} .params=${osc1} .help=${this.helpMode} @filter-change=${this.onFilterChange}></nd-filter>
          <nd-envelope .index=${1} .params=${osc1} .help=${this.helpMode} @envelope-change=${this.onEnvelopeChange}></nd-envelope>
          ${this.showVisualizers ? html`<nd-visualizer mode="scope" .analyser=${this.engine?.analyser ?? null}></nd-visualizer>` : ''}
        </div>
        <div class="osc-row">
          <nd-oscillator .index=${2} .params=${osc2} .help=${this.helpMode} @osc-change=${this.onOscChange}></nd-oscillator>
          <nd-filter .index=${2} .params=${osc2} .help=${this.helpMode} @filter-change=${this.onFilterChange}></nd-filter>
          <nd-envelope .index=${2} .params=${osc2} .help=${this.helpMode} @envelope-change=${this.onEnvelopeChange}></nd-envelope>
          ${this.showVisualizers ? html`<nd-visualizer mode="spectrum" .analyser=${this.engine?.analyser ?? null}></nd-visualizer>` : ''}
        </div>
      </section>

      <div class="tab-bar">
        <button
          class="tab ${this.activeTab === 'keyboard' ? 'active' : ''}"
          @click=${() => this.switchTab('keyboard')}
        >keyboard</button>
        <button
          class="tab ${this.activeTab === 'sequencer' ? 'active' : ''}"
          @click=${() => this.switchTab('sequencer')}
        >sequencer</button>
      </div>

      ${this.activeTab === 'keyboard' ? html`
        <section class="keyboard-container">
          <nd-keyboard
            .help=${this.helpMode}
            @note-on=${this.onNoteOn}
            @note-off=${this.onNoteOff}
          ></nd-keyboard>
        </section>
      ` : html`
        <section class="sequencer-container">
          <nd-sequencer .sequencer=${this.sequencer!} .help=${this.helpMode}></nd-sequencer>
        </section>
      `}

      <nd-drawer
        .open=${this.drawerOpen}
        title="Effects"
        @drawer-close=${this.onDrawerClose}
        @reverb-change=${this.onReverbChange}
        @distortion-change=${this.onDistortionChange}
        @chorus-change=${this.onChorusChange}
        @eq-change=${this.onEqChange}
      >
        <nd-effects-panel .params=${fxParams}></nd-effects-panel>
      </nd-drawer>
    `;
  }

  private async start(): Promise<void> {
    if (!this.engine) {
      this.engine = new AudioEngine();
      this.allocator = new VoiceAllocator(this.engine.ctx, this.engine.destination);
      this.sequencer = new StepSequencer(this.allocator, this.engine.ctx);
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

  /** Called when the ParamStore changes — push to audio and re-render. */
  private onStoreChange = (e: Event): void => {
    const update = (e as CustomEvent<VoiceParamsUpdate>).detail;
    this.allocator?.updateParams(update);
    this.paramVersion++;
  };

  private onNoteOn(e: CustomEvent<NoteEvent>): void {
    if (!this.started) this.start();
    this.allocator?.noteOn(e.detail.note, e.detail.velocity);
  }

  private onNoteOff(e: CustomEvent<NoteEvent>): void {
    this.allocator?.noteOff(e.detail.note);
  }

  private switchTab(tab: 'keyboard' | 'sequencer'): void {
    if (tab === this.activeTab) return;
    if (this.activeTab === 'sequencer') {
      this.sequencer?.stop();
    }
    this.activeTab = tab;
  }

  private onVolumeChange(e: CustomEvent<number>): void {
    this.volume = e.detail;
    this.engine?.setMasterVolume(e.detail / 100);
  }

  private onOscChange(e: CustomEvent<OscChangeDetail>): void {
    const { index, oscType, detune, enabled, volume } = e.detail;
    const key = index === 2 ? 'osc2' : 'osc1';
    this.store.update({ [key]: { type: oscType, detune, enabled, volume } });
  }

  private onFilterChange(e: CustomEvent<{ index: number; filterType: FilterType; filterCutoff: number; filterQ: number }>): void {
    const { index, filterType, filterCutoff, filterQ } = e.detail;
    const key = index === 2 ? 'osc2' : 'osc1';
    this.store.update({ [key]: { filterType, filterCutoff, filterQ } });
  }

  private onEnvelopeChange(e: CustomEvent<{ index: number; envelope: ADSRParams }>): void {
    const { index, envelope } = e.detail;
    const key = index === 2 ? 'osc2' : 'osc1';
    this.store.update({ [key]: { envelope } });
  }

  private onEffectsStoreChange = (e: Event): void => {
    const update = (e as CustomEvent<EffectsParamsUpdate>).detail;
    this.engine?.effects.updateParams(update);
    this.fxParamVersion++;
  };

  private onReverbChange(e: CustomEvent<Partial<ReverbParams>>): void {
    this.effectsStore.update({ reverb: e.detail });
  }

  private onDistortionChange(e: CustomEvent<Partial<DistortionParams>>): void {
    this.effectsStore.update({ distortion: e.detail });
  }

  private onChorusChange(e: CustomEvent<Partial<ChorusParams>>): void {
    this.effectsStore.update({ chorus: e.detail });
  }

  private onEqChange(e: CustomEvent<Partial<EQParams>>): void {
    this.effectsStore.update({ eq: e.detail });
  }

  private onDrawerClose(): void {
    this.drawerOpen = false;
  }

  private toggleHelp(): void {
    this.helpMode = !this.helpMode;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '?') {
      e.preventDefault();
      this.toggleHelp();
      return;
    }
    const note = NdApp.KEY_MAP[e.key.toLowerCase()];
    if (note === undefined) return;
    e.preventDefault();
    this.heldKeys.add(e.key.toLowerCase());
    if (!this.started) this.start();
    this.allocator?.noteOn(note, 100);
    this.keyboard?.setNoteActive(note, true);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    const note = NdApp.KEY_MAP[key];
    if (note === undefined) return;
    this.heldKeys.delete(key);
    this.allocator?.noteOff(note);
    this.keyboard?.setNoteActive(note, false);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-app': NdApp;
  }
}
