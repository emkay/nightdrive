import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { theme, panelStyles } from '../styles/theme.js';
import type { ADSRParams } from '../types.js';

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

  @state() private attack = 0.01;
  @state() private decay = 0.2;
  @state() private sustain = 0.6;
  @state() private release = 0.3;

  override render() {
    return html`
      <div class="panel">
        <div class="panel-label">Envelope</div>
        <div class="knobs">
          <nd-knob
            label="A"
            .min=${0.001}
            .max=${2}
            .value=${this.attack}
            .step=${0.01}
            value-format="s"
            @input=${this.onAttack}
          ></nd-knob>
          <nd-knob
            label="D"
            .min=${0.001}
            .max=${2}
            .value=${this.decay}
            .step=${0.01}
            value-format="s"
            @input=${this.onDecay}
          ></nd-knob>
          <nd-knob
            label="S"
            .min=${0}
            .max=${100}
            .value=${this.sustain * 100}
            .step=${1}
            value-format="percent"
            @input=${this.onSustain}
          ></nd-knob>
          <nd-knob
            label="R"
            .min=${0.01}
            .max=${5}
            .value=${this.release}
            .step=${0.01}
            value-format="s"
            @input=${this.onRelease}
          ></nd-knob>
        </div>
      </div>
    `;
  }

  private onAttack(e: CustomEvent<number>): void {
    this.attack = e.detail;
    this.emitChange();
  }

  private onDecay(e: CustomEvent<number>): void {
    this.decay = e.detail;
    this.emitChange();
  }

  private onSustain(e: CustomEvent<number>): void {
    this.sustain = e.detail / 100;
    this.emitChange();
  }

  private onRelease(e: CustomEvent<number>): void {
    this.release = e.detail;
    this.emitChange();
  }

  private emitChange(): void {
    const envelope: ADSRParams = {
      attack: this.attack,
      decay: this.decay,
      sustain: this.sustain,
      release: this.release,
    };
    this.dispatchEvent(
      new CustomEvent('envelope-change', {
        detail: { envelope },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-envelope': NdEnvelope;
  }
}
