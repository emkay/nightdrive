import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme, panelStyles } from '../styles/theme.js';

@customElement('nd-visualizer')
export class NdVisualizer extends LitElement {
  static override styles = [
    theme,
    panelStyles,
    css`
      :host {
        display: block;
        flex: 1;
        min-width: 160px;
      }

      .panel {
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }

      canvas {
        flex: 1;
        width: 100%;
        border-radius: 4px;
      }
    `,
  ];

  @property() mode: 'scope' | 'spectrum' = 'scope';
  @property({ attribute: false }) analyser: AnalyserNode | null = null;

  private canvas!: HTMLCanvasElement;
  private animId = 0;
  private dataArray!: Uint8Array<ArrayBuffer>;

  override render() {
    return html`
      <div class="panel">
        <div class="panel-label">${this.mode === 'scope' ? 'scope' : 'spectrum'}</div>
        <canvas></canvas>
      </div>
    `;
  }

  override firstUpdated(): void {
    this.canvas = this.renderRoot.querySelector('canvas')!;
    this.startLoop();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.canvas) this.startLoop();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopLoop();
  }

  private startLoop(): void {
    if (this.animId) return;
    const draw = () => {
      this.animId = requestAnimationFrame(draw);
      this.draw();
    };
    this.animId = requestAnimationFrame(draw);
  }

  private stopLoop(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  private draw(): void {
    const analyser = this.analyser;
    if (!analyser) return;

    const canvas = this.canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    const dpr = devicePixelRatio;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const bufLen = analyser.frequencyBinCount;
    if (!this.dataArray || this.dataArray.length !== bufLen) {
      this.dataArray = new Uint8Array(bufLen) as Uint8Array<ArrayBuffer>;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Get accent color from CSS custom property
    const accent = getComputedStyle(this).getPropertyValue('--nd-accent').trim() || '#00ccff';
    const bg = getComputedStyle(this).getPropertyValue('--nd-bg-panel').trim() || '#222';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (this.mode === 'scope') {
      this.drawScope(ctx, analyser, w, h, accent);
    } else {
      this.drawSpectrum(ctx, analyser, w, h, accent);
    }
  }

  private drawScope(
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode,
    w: number,
    h: number,
    accent: string,
  ): void {
    analyser.getByteTimeDomainData(this.dataArray);
    const bufLen = this.dataArray.length;

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = accent;
    ctx.beginPath();

    const sliceWidth = w / bufLen;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }

  private drawSpectrum(
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode,
    w: number,
    h: number,
    accent: string,
  ): void {
    analyser.getByteFrequencyData(this.dataArray);

    // Show ~128 bars max for readability
    const bufLen = Math.min(this.dataArray.length, 128);
    const barWidth = w / bufLen;

    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 4;

    for (let i = 0; i < bufLen; i++) {
      const barHeight = (this.dataArray[i] / 255) * h;
      ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
    }

    ctx.shadowBlur = 0;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-visualizer': NdVisualizer;
  }
}
