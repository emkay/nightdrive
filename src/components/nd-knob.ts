import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';

const ANGLE_RANGE = 270;
const START_ANGLE = (360 - ANGLE_RANGE) / 2 + 90;

@customElement('nd-knob')
export class NdKnob extends LitElement {
  static override styles = [
    theme,
    css`
      :host {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        user-select: none;
        touch-action: none;
        cursor: ns-resize;
      }

      .label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--nd-fg-dim);
      }

      .value-display {
        font-size: 10px;
        color: var(--nd-fg-dim);
        font-family: var(--nd-font-mono);
        min-height: 14px;
      }

      svg {
        width: 48px;
        height: 48px;
        filter: drop-shadow(0 0 4px var(--nd-accent-glow));
      }

      .track {
        fill: none;
        stroke: var(--nd-border);
        stroke-width: 3;
        stroke-linecap: round;
      }

      .filled {
        fill: none;
        stroke: var(--nd-accent);
        stroke-width: 3;
        stroke-linecap: round;
      }

      .indicator {
        stroke: var(--nd-fg);
        stroke-width: 2;
        stroke-linecap: round;
      }
    `,
  ];

  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) value = 50;
  @property({ type: Number }) step = 1;
  @property({ type: String }) label = '';
  @property({ type: String, attribute: 'value-format' }) valueFormat: 'number' | 'percent' | 'hz' | 'ms' | 's' | 'db' = 'number';
  @property({ type: String }) scale: 'linear' | 'log' = 'linear';

  private dragging = false;
  private dragStartY = 0;
  private dragStartValue = 0;

  override render() {
    const norm = this.valueToNorm(this.value);
    const angle = START_ANGLE + norm * ANGLE_RANGE;

    const cx = 24, cy = 24, r = 18;
    const trackPath = this.describeArc(cx, cy, r, START_ANGLE, START_ANGLE + ANGLE_RANGE);
    const filledPath = norm > 0.001 ? this.describeArc(cx, cy, r, START_ANGLE, angle) : '';

    const rad = (angle - 90) * Math.PI / 180;
    const ix1 = cx + Math.cos(rad) * 10;
    const iy1 = cy + Math.sin(rad) * 10;
    const ix2 = cx + Math.cos(rad) * 17;
    const iy2 = cy + Math.sin(rad) * 17;

    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : ''}
      <svg viewBox="0 0 48 48"
        @pointerdown=${this.onPointerDown}>
        ${svg`
          <path class="track" d=${trackPath} />
          ${filledPath ? svg`<path class="filled" d=${filledPath} />` : ''}
          <line class="indicator" x1=${ix1} y1=${iy1} x2=${ix2} y2=${iy2} />
        `}
      </svg>
      <span class="value-display">${this.formatValue()}</span>
    `;
  }

  private valueToNorm(value: number): number {
    if (this.scale === 'log' && this.min > 0) {
      return Math.log(value / this.min) / Math.log(this.max / this.min);
    }
    return (value - this.min) / (this.max - this.min);
  }

  private normToValue(norm: number): number {
    if (this.scale === 'log' && this.min > 0) {
      return this.min * Math.pow(this.max / this.min, norm);
    }
    return this.min + norm * (this.max - this.min);
  }

  private formatValue(): string {
    switch (this.valueFormat) {
      case 'percent': return `${Math.round(this.value)}%`;
      case 'hz': return this.value >= 1000 ? `${(this.value / 1000).toFixed(1)}k` : `${Math.round(this.value)}`;
      case 'ms': return `${Math.round(this.value)}ms`;
      case 's': return `${this.value.toFixed(2)}s`;
      case 'db': return `${this.value > 0 ? '+' : ''}${this.value.toFixed(1)}dB`;
      default: return `${Math.round(this.value * 100) / 100}`;
    }
  }

  private describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCart(cx, cy, r, endAngle - 90);
    const end = this.polarToCart(cx, cy, r, startAngle - 90);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  private polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = angleDeg * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.dragging = true;
    this.dragStartY = e.clientY;
    this.dragStartValue = this.value;
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dy = this.dragStartY - e.clientY;
    const startNorm = this.valueToNorm(this.dragStartValue);
    const newNorm = Math.max(0, Math.min(1, startNorm + dy / 200));
    let newValue = this.normToValue(newNorm);

    newValue = Math.round(newValue / this.step) * this.step;
    newValue = Math.max(this.min, Math.min(this.max, newValue));

    if (newValue !== this.value) {
      this.value = newValue;
      this.dispatchEvent(new CustomEvent('input', { detail: this.value, bubbles: true, composed: true }));
    }
  };

  private onPointerUp = (): void => {
    this.dragging = false;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  };

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.dragging) {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      this.dragging = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-knob': NdKnob;
  }
}
