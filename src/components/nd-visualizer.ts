import { LitElement, html, css, type PropertyValues } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { theme, panelStyles } from '../styles/theme.js'

@customElement('nd-visualizer')
export class NdVisualizer extends LitElement {
  static override styles = [
    theme,
    panelStyles,
    css`
      :host {
        display: block;
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
  ]

  @property() mode: 'scope' | 'spectrum' = 'scope'
  @property({ attribute: false }) analyser: AnalyserNode | null = null

  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D
  private accentColor = ''
  private bgColor = ''
  private animId = 0
  private dataArray!: Uint8Array<ArrayBuffer>

  override render() {
    return html`
      <div class="panel">
        <div class="panel-label">${this.mode}</div>
        <canvas></canvas>
      </div>
    `
  }

  override firstUpdated(): void {
    this.canvas = this.renderRoot.querySelector('canvas')!
    this.ctx = this.canvas.getContext('2d')!
    const style = getComputedStyle(this)
    this.accentColor = style.getPropertyValue('--nd-accent').trim() || '#00ccff'
    this.bgColor = style.getPropertyValue('--nd-bg-panel').trim() || '#222'
    if (this.analyser) this.startLoop()
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('analyser')) {
      if (this.analyser && this.canvas) {
        this.startLoop()
      } else {
        this.stopLoop()
      }
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.canvas && this.analyser) this.startLoop()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.stopLoop()
  }

  private startLoop(): void {
    if (this.animId) return
    const draw = () => {
      this.animId = requestAnimationFrame(draw)
      this.draw()
    }
    this.animId = requestAnimationFrame(draw)
  }

  private stopLoop(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId)
      this.animId = 0
    }
  }

  private draw(): void {
    const analyser = this.analyser
    if (!analyser) return

    const canvas = this.canvas
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return

    const dpr = devicePixelRatio
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }

    const bufLen = analyser.frequencyBinCount
    if (!this.dataArray || this.dataArray.length !== bufLen) {
      this.dataArray = new Uint8Array(bufLen) as Uint8Array<ArrayBuffer>
    }

    const ctx = this.ctx
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = this.bgColor
    ctx.fillRect(0, 0, w, h)

    if (this.mode === 'scope') {
      this.drawScope(w, h)
    } else {
      this.drawSpectrum(w, h)
    }
  }

  private drawScope(w: number, h: number): void {
    this.analyser!.getByteTimeDomainData(this.dataArray)
    const bufLen = this.dataArray.length

    this.ctx.lineWidth = 1.5
    this.ctx.strokeStyle = this.accentColor
    this.ctx.beginPath()

    const sliceWidth = w / bufLen
    let x = 0
    for (let i = 0; i < bufLen; i++) {
      const v = this.dataArray[i] / 128.0
      const y = (v * h) / 2
      if (i === 0) this.ctx.moveTo(x, y)
      else this.ctx.lineTo(x, y)
      x += sliceWidth
    }
    this.ctx.lineTo(w, h / 2)
    this.ctx.stroke()
  }

  private drawSpectrum(w: number, h: number): void {
    this.analyser!.getByteFrequencyData(this.dataArray)

    const bufLen = Math.min(this.dataArray.length, 128)
    const barWidth = w / bufLen

    this.ctx.fillStyle = this.accentColor
    this.ctx.shadowColor = this.accentColor
    this.ctx.shadowBlur = 4

    for (let i = 0; i < bufLen; i++) {
      const barHeight = (this.dataArray[i] / 255) * h
      this.ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight)
    }

    this.ctx.shadowBlur = 0
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-visualizer': NdVisualizer;
  }
}
