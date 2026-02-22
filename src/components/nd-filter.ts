import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { theme, panelStyles, toggleButtonStyles } from '../styles/theme.js'
import type { FilterType, OscParams } from '../types.js'
import './nd-tooltip.js'

const FILTER_TYPES: { type: FilterType, label: string }[] = [
  { type: 'lowpass', label: 'LP' },
  { type: 'highpass', label: 'HP' },
  { type: 'bandpass', label: 'BP' },
  { type: 'notch', label: 'NOTCH' },
]

@customElement('nd-filter')
export class NdFilter extends LitElement {
  static override styles = [
    theme,
    panelStyles,
    toggleButtonStyles,
    css`
      :host {
        display: block;
      }

      .filter-types {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
      }

      .knobs {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
    `,
  ]

  @property({ type: Number }) index = 1
  @property({ attribute: false }) params!: OscParams
  @property({ type: Boolean }) help = false

  override render() {
    const p = this.params
    if (!p) return html``
    return html`
      <div class="panel">
        <div class="panel-label">Filter ${this.index}</div>
        <nd-tooltip text="Filter type — LP: warm, HP: thin, BP: focused, NOTCH: scoop" .active=${this.help}>
          <div class="filter-types">
            ${FILTER_TYPES.map(
              f => html`
                <button
                  class="toggle-btn ${p.filterType === f.type ? 'active' : ''}"
                  @click=${() => this.selectType(f.type)}
                >
                  ${f.label}
                </button>
              `,
            )}
          </div>
        </nd-tooltip>
        <div class="knobs">
          <nd-tooltip text="Cutoff frequency. Lower values darken the sound." .active=${this.help}>
            <nd-knob
              label="CUTOFF"
              .min=${20}
              .max=${20000}
              .value=${p.filterCutoff}
              .step=${1}

              scale="log"
              value-format="hz"
              @input=${this.onCutoff}
            ></nd-knob>
          </nd-tooltip>
          <nd-tooltip text="Resonance. Adds a peak at the cutoff frequency." .active=${this.help}>
            <nd-knob
              label="RES"
              .min=${0}
              .max=${30}
              .value=${p.filterQ}
              .step=${0.5}

              @input=${this.onResonance}
            ></nd-knob>
          </nd-tooltip>
        </div>
      </div>
    `
  }

  private selectType(type: FilterType): void {
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: { index: this.index, filterType: type, filterCutoff: this.params.filterCutoff, filterQ: this.params.filterQ },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private onCutoff(e: CustomEvent<number>): void {
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: { index: this.index, filterType: this.params.filterType, filterCutoff: e.detail, filterQ: this.params.filterQ },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private onResonance(e: CustomEvent<number>): void {
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: { index: this.index, filterType: this.params.filterType, filterCutoff: this.params.filterCutoff, filterQ: e.detail },
        bubbles: true,
        composed: true,
      }),
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-filter': NdFilter
  }
}
