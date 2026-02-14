import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { theme, panelStyles, toggleButtonStyles } from '../styles/theme.js';
import type { FilterType } from '../types.js';

const FILTER_TYPES: { type: FilterType; label: string }[] = [
  { type: 'lowpass', label: 'LP' },
  { type: 'highpass', label: 'HP' },
  { type: 'bandpass', label: 'BP' },
  { type: 'notch', label: 'NOTCH' },
];

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
  ];

  @state() private filterType: FilterType = 'lowpass';
  @state() private cutoff = 2000;
  @state() private resonance = 5;

  override render() {
    return html`
      <div class="panel">
        <div class="panel-label">Filter</div>
        <div class="filter-types">
          ${FILTER_TYPES.map(
            f => html`
              <button
                class="toggle-btn ${this.filterType === f.type ? 'active' : ''}"
                @click=${() => this.selectType(f.type)}
              >
                ${f.label}
              </button>
            `,
          )}
        </div>
        <div class="knobs">
          <nd-knob
            label="CUTOFF"
            .min=${20}
            .max=${20000}
            .value=${this.cutoff}
            .step=${1}
            scale="log"
            value-format="hz"
            @input=${this.onCutoff}
          ></nd-knob>
          <nd-knob
            label="RES"
            .min=${0}
            .max=${30}
            .value=${this.resonance}
            .step=${0.5}
            @input=${this.onResonance}
          ></nd-knob>
        </div>
      </div>
    `;
  }

  private selectType(type: FilterType): void {
    this.filterType = type;
    this.emitChange();
  }

  private onCutoff(e: CustomEvent<number>): void {
    this.cutoff = e.detail;
    this.emitChange();
  }

  private onResonance(e: CustomEvent<number>): void {
    this.resonance = e.detail;
    this.emitChange();
  }

  private emitChange(): void {
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: {
          filterType: this.filterType,
          filterCutoff: this.cutoff,
          filterQ: this.resonance,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-filter': NdFilter;
  }
}
