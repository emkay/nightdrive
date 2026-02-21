import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { theme, panelStyles, effectPanelStyles } from '../styles/theme.js'
import type { ChorusParams } from '../types.js'

@customElement('nd-chorus')
export class NdChorus extends LitElement {
  static override styles = [theme, panelStyles, effectPanelStyles]

  @property({ attribute: false }) params!: ChorusParams

  override render() {
    const p = this.params
    if (!p) return html``
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-label" style="margin-bottom:0">CHORUS</span>
          <button class="on-off ${p.enabled ? 'on' : ''}" @click=${this.toggle}>
            ${p.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div class="knobs ${p.enabled ? '' : 'disabled'}">
          <nd-knob label="MIX" .min=${0} .max=${100} .value=${p.mix * 100} .step=${1}
            value-format="percent" @input=${this.onMix}></nd-knob>
          <nd-knob label="RATE" .min=${0.1} .max=${10} .value=${p.rate} .step=${0.1}
            value-format="hz" @input=${this.onRate}></nd-knob>
          <nd-knob label="DEPTH" .min=${0} .max=${100} .value=${p.depth * 100} .step=${1}
            value-format="percent" @input=${this.onDepth}></nd-knob>
          <nd-knob label="DELAY" .min=${5} .max=${30} .value=${p.delay} .step=${1}
            value-format="ms" @input=${this.onDelay}></nd-knob>
        </div>
      </div>
    `
  }

  private toggle(): void { this.emit({ enabled: !this.params.enabled }) }
  private onMix(e: CustomEvent<number>): void { this.emit({ mix: e.detail / 100 }) }
  private onRate(e: CustomEvent<number>): void { this.emit({ rate: e.detail }) }
  private onDepth(e: CustomEvent<number>): void { this.emit({ depth: e.detail / 100 }) }
  private onDelay(e: CustomEvent<number>): void { this.emit({ delay: e.detail }) }

  private emit(detail: Partial<ChorusParams>): void {
    this.dispatchEvent(new CustomEvent('chorus-change', { detail, bubbles: true, composed: true }))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-chorus': NdChorus;
  }
}
