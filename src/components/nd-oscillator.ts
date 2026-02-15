import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme, panelStyles, toggleButtonStyles } from '../styles/theme.js';
import type { OscType, OscParams } from '../types.js';
import './nd-tooltip.js';

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
  @property({ attribute: false }) params!: OscParams;
  @property({ type: Boolean }) help = false;

  override render() {
    const p = this.params;
    if (!p) return html``;
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-label" style="margin-bottom:0">OSC ${this.index}</span>
          <nd-tooltip text="Enable or disable this oscillator" .active=${this.help}>
            <button
              class="on-off ${p.enabled ? 'on' : ''}"
              @click=${this.toggleEnabled}
            >${p.enabled ? 'ON' : 'OFF'}</button>
          </nd-tooltip>
        </div>
        <nd-tooltip text="Waveform shape — SIN: smooth, TRI: mellow, SAW: bright, SQR: hollow" .active=${this.help}>
          <div class="waveforms" style="${p.enabled ? '' : 'opacity:0.3;pointer-events:none'}">
            ${WAVEFORMS.map(
              w => html`
                <button
                  class="toggle-btn ${p.type === w.type ? 'active' : ''}"
                  @click=${() => this.selectWave(w.type)}
                >
                  ${w.label}
                </button>
              `,
            )}
          </div>
        </nd-tooltip>
        <div class="knobs" style="${p.enabled ? '' : 'opacity:0.3;pointer-events:none'}">
          <nd-tooltip text="Oscillator volume. Drag up/down to adjust." .active=${this.help}>
            <nd-knob
              label="VOL"
              .min=${0}
              .max=${100}
              .value=${p.volume * 100}
              .step=${1}
              .help=${this.help}
              value-format="percent"
              @input=${this.onVolume}
            ></nd-knob>
          </nd-tooltip>
          <nd-tooltip text="Fine-tune pitch ±100 cents. Detune both oscillators for chorus." .active=${this.help}>
            <nd-knob
              label="DETUNE"
              .min=${-100}
              .max=${100}
              .value=${p.detune}
              .step=${1}
              .help=${this.help}
              @input=${this.onDetune}
            ></nd-knob>
          </nd-tooltip>
        </div>
      </div>
    `;
  }

  private toggleEnabled(): void {
    this.emitChange({ enabled: !this.params.enabled });
  }

  private selectWave(type: OscType): void {
    this.emitChange({ oscType: type });
  }

  private onVolume(e: CustomEvent<number>): void {
    this.emitChange({ volume: e.detail / 100 });
  }

  private onDetune(e: CustomEvent<number>): void {
    this.emitChange({ detune: e.detail });
  }

  private emitChange(partial: { oscType?: OscType; detune?: number; enabled?: boolean; volume?: number }): void {
    const p = this.params;
    this.dispatchEvent(
      new CustomEvent<OscChangeDetail>('osc-change', {
        detail: {
          index: this.index,
          oscType: partial.oscType ?? p.type,
          detune: partial.detune ?? p.detune,
          enabled: partial.enabled ?? p.enabled,
          volume: partial.volume ?? p.volume,
        },
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
