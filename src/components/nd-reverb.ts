import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { theme, panelStyles, effectPanelStyles } from '../styles/theme.js'
import type { ReverbParams } from '../types.js'

@customElement('nd-reverb')
export class NdReverb extends LitElement {
  static override styles = [theme, panelStyles, effectPanelStyles]

  @property({ attribute: false }) params!: ReverbParams

  override render() {
    const p = this.params
    if (!p) return html``
    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-label" style="margin-bottom:0">REVERB</span>
          <button class="on-off ${p.enabled ? 'on' : ''}" @click=${this.toggle}>
            ${p.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div class="knobs ${p.enabled ? '' : 'disabled'}">
          <nd-knob label="MIX" .min=${0} .max=${100} .value=${p.mix * 100} .step=${1}
            value-format="percent" @input=${this.onMix}></nd-knob>
          <nd-knob label="DECAY" .min=${0.1} .max=${10} .value=${p.decay} .step=${0.1}
            value-format="s" @input=${this.onDecay}></nd-knob>
          <nd-knob label="PRE-DLY" .min=${0} .max=${100} .value=${p.preDelay * 1000} .step=${1}
            value-format="ms" @input=${this.onPreDelay}></nd-knob>
        </div>
      </div>
    `
  }

  private toggle(): void { this.emit({ enabled: !this.params.enabled }) }
  private onMix(e: CustomEvent<number>): void { this.emit({ mix: e.detail / 100 }) }
  private onDecay(e: CustomEvent<number>): void { this.emit({ decay: e.detail }) }
  private onPreDelay(e: CustomEvent<number>): void { this.emit({ preDelay: e.detail / 1000 }) }

  private emit(detail: Partial<ReverbParams>): void {
    this.dispatchEvent(new CustomEvent('reverb-change', { detail, bubbles: true, composed: true }))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-reverb': NdReverb;
  }
}
