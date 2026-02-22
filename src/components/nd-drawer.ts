import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { theme } from '../styles/theme.js'

@customElement('nd-drawer')
export class NdDrawer extends LitElement {
  static override styles = [
    theme,
    css`
      :host {
        position: fixed;
        inset: 0;
        z-index: 1000;
        pointer-events: none;
      }

      :host([open]) {
        pointer-events: auto;
      }

      .backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 250ms ease;
      }

      :host([open]) .backdrop {
        opacity: 1;
      }

      .panel {
        position: absolute;
        top: 0;
        right: 0;
        width: 340px;
        height: 100%;
        background: var(--nd-bg-panel);
        border-left: 1px solid var(--nd-border);
        transform: translateX(100%);
        transition: transform 250ms ease;
        display: flex;
        flex-direction: column;
      }

      :host([open]) .panel {
        transform: translateX(0);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--nd-border);
      }

      .title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--nd-fg-dim);
      }

      .close-btn {
        background: none;
        border: 1px solid var(--nd-border);
        border-radius: 4px;
        color: var(--nd-fg-dim);
        font-size: 13px;
        font-family: var(--nd-font-mono);
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.1s;
      }

      .close-btn:hover {
        border-color: var(--nd-accent);
        color: var(--nd-fg);
      }

      .content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
    `,
  ]

  @property({ type: Boolean, reflect: true }) open = false
  @property() title = ''

  override render() {
    return html`
      <div class="backdrop" @click=${this.close}></div>
      <div class="panel">
        <div class="header">
          <span class="title">${this.title}</span>
          <button class="close-btn" @click=${this.close}>&times;</button>
        </div>
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('drawer-close', { bubbles: true, composed: true }))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-drawer': NdDrawer
  }
}
