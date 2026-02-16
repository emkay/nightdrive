import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';
import type { EffectsParams } from '../types.js';
import './nd-distortion.js';
import './nd-chorus.js';
import './nd-reverb.js';
import './nd-eq.js';

@customElement('nd-effects-panel')
export class NdEffectsPanel extends LitElement {
  static override styles = [
    theme,
    css`
      :host { display: flex; flex-direction: column; gap: 12px; }
    `,
  ];

  @property({ attribute: false }) params!: EffectsParams;

  override render() {
    const p = this.params;
    if (!p) return html``;
    return html`
      <nd-eq .params=${p.eq}></nd-eq>
      <nd-distortion .params=${p.distortion}></nd-distortion>
      <nd-chorus .params=${p.chorus}></nd-chorus>
      <nd-reverb .params=${p.reverb}></nd-reverb>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-effects-panel': NdEffectsPanel;
  }
}
