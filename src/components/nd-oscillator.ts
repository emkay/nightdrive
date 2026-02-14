import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { theme, panelStyles, toggleButtonStyles } from '../styles/theme.js';
import type { OscType } from '../types.js';

const WAVEFORMS: { type: OscType; label: string }[] = [
  { type: 'sine', label: 'SIN' },
  { type: 'triangle', label: 'TRI' },
  { type: 'sawtooth', label: 'SAW' },
  { type: 'square', label: 'SQR' },
];

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

      .waveforms {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
      }

      .knobs {
        display: flex;
        justify-content: center;
      }
    `,
  ];

  @state() private oscType: OscType = 'sawtooth';
  @state() private detune = 0;

  override render() {
    return html`
      <div class="panel">
        <div class="panel-label">Oscillator</div>
        <div class="waveforms">
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
        <div class="knobs">
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

  private selectWave(type: OscType): void {
    this.oscType = type;
    this.emitChange();
  }

  private onDetune(e: CustomEvent<number>): void {
    this.detune = e.detail;
    this.emitChange();
  }

  private emitChange(): void {
    this.dispatchEvent(
      new CustomEvent('osc-change', {
        detail: { oscType: this.oscType, detune: this.detune },
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
