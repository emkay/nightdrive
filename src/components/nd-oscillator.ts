import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { theme, panelStyles, toggleButtonStyles } from '../styles/theme.js';
import type { OscType } from '../types.js';

const WAVEFORMS: { type: OscType; label: string }[] = [
  { type: 'sine', label: 'SIN' },
  { type: 'triangle', label: 'TRI' },
  { type: 'sawtooth', label: 'SAW' },
  { type: 'square', label: 'SQR' },
];

export interface OscChangeDetail {
  index: number;
  oscType: OscType;
  detune: number;
  enabled: boolean;
  volume: number;  // 0–1
}

@customElement('nd-oscillator')
export class NdOscillator extends LitElement {
  static override styles = [
    theme,
    panelStyles,
    toggleButtonStyles,
    css`
      :host {
        display: block;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .on-off {
        background: var(--nd-bg-surface);
        border: 1px solid var(--nd-border);
        border-radius: 4px;
        color: var(--nd-fg-dim);
        padding: 2px 8px;
        font-size: 10px;
        font-family: var(--nd-font-mono);
        cursor: pointer;
        transition: all 0.1s;
      }

      .on-off.on {
        background: var(--nd-accent);
        color: var(--nd-bg);
        border-color: var(--nd-accent);
      }

      .waveforms {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
      }

      .knobs {
        display: flex;
        justify-content: center;
      }

      :host([disabled]) .waveforms,
      :host([disabled]) .knobs {
        opacity: 0.3;
        pointer-events: none;
      }
    `,
  ];

  @property({ type: Number }) index = 1;
  @property({ type: Boolean }) enabled = true;
  @property({ attribute: 'osc-type' }) oscType: OscType = 'sawtooth';

  @state() private detune = 0;
  @state() private volume = 80;

  override render() {
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-label" style="margin-bottom:0">OSC ${this.index}</span>
          <button
            class="on-off ${this.enabled ? 'on' : ''}"
            @click=${this.toggleEnabled}
          >${this.enabled ? 'ON' : 'OFF'}</button>
        </div>
        <div class="waveforms" style="${this.enabled ? '' : 'opacity:0.3;pointer-events:none'}">
          ${WAVEFORMS.map(
            w => html`
              <button
                class="toggle-btn ${this.oscType === w.type ? 'active' : ''}"
                @click=${() => this.selectWave(w.type)}
              >
                ${w.label}
              </button>
            `,
          )}
        </div>
        <div class="knobs" style="${this.enabled ? '' : 'opacity:0.3;pointer-events:none'}">
          <nd-knob
            label="VOL"
            .min=${0}
            .max=${100}
            .value=${this.volume}
            .step=${1}
            value-format="percent"
            @input=${this.onVolume}
          ></nd-knob>
          <nd-knob
            label="DETUNE"
            .min=${-100}
            .max=${100}
            .value=${this.detune}
            .step=${1}
            @input=${this.onDetune}
          ></nd-knob>
        </div>
      </div>
    `;
  }

  private toggleEnabled(): void {
    this.enabled = !this.enabled;
    this.emitChange();
  }

  private selectWave(type: OscType): void {
    this.oscType = type;
    this.emitChange();
  }

  private onVolume(e: CustomEvent<number>): void {
    this.volume = e.detail;
    this.emitChange();
  }

  private onDetune(e: CustomEvent<number>): void {
    this.detune = e.detail;
    this.emitChange();
  }

  private emitChange(): void {
    this.dispatchEvent(
      new CustomEvent<OscChangeDetail>('osc-change', {
        detail: { index: this.index, oscType: this.oscType, detune: this.detune, enabled: this.enabled, volume: this.volume / 100 },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-oscillator': NdOscillator;
  }
}
