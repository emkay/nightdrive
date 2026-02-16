import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme, panelStyles, toggleButtonStyles } from '../styles/theme.js';
import type { DistortionParams } from '../types.js';

@customElement('nd-distortion')
export class NdDistortion extends LitElement {
  static override styles = [
    theme,
    panelStyles,
    toggleButtonStyles,
    css`
      :host { display: block; }
      .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .on-off {
        background: var(--nd-bg-surface); border: 1px solid var(--nd-border); border-radius: 4px;
        color: var(--nd-fg-dim); padding: 2px 8px; font-size: 10px; font-family: var(--nd-font-mono);
        cursor: pointer; transition: all 0.1s;
      }
      .on-off.on { background: var(--nd-accent); color: var(--nd-bg); border-color: var(--nd-accent); }
      .knobs { display: flex; justify-content: center; }
      .knobs.disabled { opacity: 0.3; pointer-events: none; }
    `,
  ];

  @property({ attribute: false }) params!: DistortionParams;

  override render() {
    const p = this.params;
    if (!p) return html``;
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-label" style="margin-bottom:0">DISTORTION</span>
          <button class="on-off ${p.enabled ? 'on' : ''}" @click=${this.toggle}>
            ${p.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div class="knobs ${p.enabled ? '' : 'disabled'}">
          <nd-knob label="MIX" .min=${0} .max=${100} .value=${p.mix * 100} .step=${1}
            value-format="percent" @input=${this.onMix}></nd-knob>
          <nd-knob label="DRIVE" .min=${1} .max=${100} .value=${p.drive} .step=${1}
            @input=${this.onDrive}></nd-knob>
          <nd-knob label="TONE" .min=${200} .max=${8000} .value=${p.tone} .step=${1}
            value-format="hz" scale="log" @input=${this.onTone}></nd-knob>
        </div>
      </div>
    `;
  }

  private toggle(): void { this.emit({ enabled: !this.params.enabled }); }
  private onMix(e: CustomEvent<number>): void { this.emit({ mix: e.detail / 100 }); }
  private onDrive(e: CustomEvent<number>): void { this.emit({ drive: e.detail }); }
  private onTone(e: CustomEvent<number>): void { this.emit({ tone: e.detail }); }

  private emit(detail: Partial<DistortionParams>): void {
    this.dispatchEvent(new CustomEvent('distortion-change', { detail, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-distortion': NdDistortion;
  }
}
