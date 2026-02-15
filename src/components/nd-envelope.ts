import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme, panelStyles } from '../styles/theme.js';
import type { ADSRParams, OscParams } from '../types.js';

@customElement('nd-envelope')
export class NdEnvelope extends LitElement {
  static override styles = [
    theme,
    panelStyles,
    css`
      :host {
        display: block;
      }

      .knobs {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
    `,
  ];

  @property({ type: Number }) index = 1;
  @property({ attribute: false }) params!: OscParams;

  override render() {
    const p = this.params;
    if (!p) return html``;
    const env = p.envelope;
    return html`
      <div class="panel">
        <div class="panel-label">Envelope ${this.index}</div>
        <div class="knobs">
          <nd-knob
            label="A"
            .min=${0.001}
            .max=${2}
            .value=${env.attack}
            .step=${0.01}
            value-format="s"
            @input=${this.onAttack}
          ></nd-knob>
          <nd-knob
            label="D"
            .min=${0.001}
            .max=${2}
            .value=${env.decay}
            .step=${0.01}
            value-format="s"
            @input=${this.onDecay}
          ></nd-knob>
          <nd-knob
            label="S"
            .min=${0}
            .max=${100}
            .value=${env.sustain * 100}
            .step=${1}
            value-format="percent"
            @input=${this.onSustain}
          ></nd-knob>
          <nd-knob
            label="R"
            .min=${0.01}
            .max=${5}
            .value=${env.release}
            .step=${0.01}
            value-format="s"
            @input=${this.onRelease}
          ></nd-knob>
        </div>
      </div>
    `;
  }

  private emitEnvelope(envelope: ADSRParams): void {
    this.dispatchEvent(
      new CustomEvent('envelope-change', {
        detail: { index: this.index, envelope },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onAttack(e: CustomEvent<number>): void {
    this.emitEnvelope({ ...this.params.envelope, attack: e.detail });
  }

  private onDecay(e: CustomEvent<number>): void {
    this.emitEnvelope({ ...this.params.envelope, decay: e.detail });
  }

  private onSustain(e: CustomEvent<number>): void {
    this.emitEnvelope({ ...this.params.envelope, sustain: e.detail / 100 });
  }

  private onRelease(e: CustomEvent<number>): void {
    this.emitEnvelope({ ...this.params.envelope, release: e.detail });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-envelope': NdEnvelope;
  }
}
