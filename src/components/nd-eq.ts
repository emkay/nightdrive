import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { theme, panelStyles, effectPanelStyles } from '../styles/theme.js'
import type { EQParams } from '../types.js'

@customElement('nd-eq')
export class NdEQ extends LitElement {
  static override styles = [theme, panelStyles, effectPanelStyles]

  @property({ attribute: false }) params!: EQParams

  override render() {
    const p = this.params
    if (!p) return html``
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-label" style="margin-bottom:0">EQ</span>
          <button class="on-off ${p.enabled ? 'on' : ''}" @click=${this.toggle}>
            ${p.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div class="knobs ${p.enabled ? '' : 'disabled'}">
          <nd-knob label="LOW" .min=${-12} .max=${12} .value=${p.lowGain} .step=${0.5}
            value-format="db" @input=${this.onLow}></nd-knob>
          <nd-knob label="MID" .min=${-12} .max=${12} .value=${p.midGain} .step=${0.5}
            value-format="db" @input=${this.onMid}></nd-knob>
          <nd-knob label="MID FRQ" .min=${200} .max=${8000} .value=${p.midFreq} .step=${1}
            value-format="hz" scale="log" @input=${this.onMidFreq}></nd-knob>
          <nd-knob label="HIGH" .min=${-12} .max=${12} .value=${p.highGain} .step=${0.5}
            value-format="db" @input=${this.onHigh}></nd-knob>
        </div>
      </div>
    `
  }

  private toggle(): void { this.emit({ enabled: !this.params.enabled }) }
  private onLow(e: CustomEvent<number>): void { this.emit({ lowGain: e.detail }) }
  private onMid(e: CustomEvent<number>): void { this.emit({ midGain: e.detail }) }
  private onMidFreq(e: CustomEvent<number>): void { this.emit({ midFreq: e.detail }) }
  private onHigh(e: CustomEvent<number>): void { this.emit({ highGain: e.detail }) }

  private emit(detail: Partial<EQParams>): void {
    this.dispatchEvent(new CustomEvent('eq-change', { detail, bubbles: true, composed: true }))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-eq': NdEQ;
  }
}
