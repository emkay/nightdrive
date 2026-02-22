import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { theme } from '../styles/theme.js'

@customElement('nd-tooltip')
export class NdTooltip extends LitElement {
  static override styles = [
    theme,
    css`
      :host {
        display: contents;
      }

      .wrapper {
        position: relative;
      }

      .tip {
        display: none;
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        background: #111;
        color: var(--nd-fg);
        font-size: 11px;
        font-family: var(--nd-font);
        line-height: 1.4;
        padding: 6px 10px;
        border: 1px solid var(--nd-accent);
        border-radius: 4px;
        max-width: 200px;
        width: max-content;
        z-index: 50;
        pointer-events: none;
        white-space: normal;
      }

      .tip.top {
        bottom: calc(100% + 6px);
      }

      .tip.bottom {
        top: calc(100% + 6px);
      }

      .tip::after {
        content: '';
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
      }

      .tip.top::after {
        top: 100%;
        border-top-color: var(--nd-accent);
      }

      .tip.bottom::after {
        bottom: 100%;
        border-bottom-color: var(--nd-accent);
      }

      :host([active]) .wrapper:hover .tip {
        display: block;
      }

      :host([active]) .wrapper:hover .slot-content {
        outline: 1px dashed var(--nd-accent);
        outline-offset: 2px;
        border-radius: 4px;
      }
    `,
  ]

  @property({ type: String }) text = ''
  @property({ type: Boolean, reflect: true }) active = false
  @property({ type: String }) position: 'top' | 'bottom' = 'top'

  override render() {
    return html`
      <div class="wrapper">
        <div class="tip ${this.position}">${this.text}</div>
        <div class="slot-content">
          <slot></slot>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-tooltip': NdTooltip
  }
}
