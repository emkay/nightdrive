import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { theme, panelStyles } from '../styles/theme.js';
import { StepSequencer, midiNoteName } from '../audio/sequencer.js';

@customElement('nd-sequencer')
export class NdSequencer extends LitElement {
  static override styles = [
    theme,
    panelStyles,
    css`
      :host {
        display: block;
      }

      .sequencer {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .transport {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .play-btn {
        background: var(--nd-bg-surface);
        border: 1px solid var(--nd-border);
        border-radius: 4px;
        color: var(--nd-fg-dim);
        padding: 6px 16px;
        font-size: 12px;
        font-family: var(--nd-font-mono);
        cursor: pointer;
        transition: all 0.1s;
        letter-spacing: 1px;
      }

      .play-btn:hover {
        border-color: var(--nd-accent);
        color: var(--nd-fg);
      }

      .play-btn.playing {
        background: var(--nd-accent);
        color: var(--nd-bg);
        border-color: var(--nd-accent);
      }

      .steps {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }

      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 8px 4px;
        border: 1px solid var(--nd-border);
        border-radius: var(--nd-radius);
        background: var(--nd-bg-surface);
        min-width: 64px;
      }

      .step.active {
        border-color: var(--nd-accent);
        box-shadow: 0 0 8px var(--nd-accent-glow);
      }

      .step-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--nd-border);
        transition: background 0.05s;
      }

      .step.active .step-dot {
        background: var(--nd-accent);
        box-shadow: 0 0 6px var(--nd-accent);
      }

      .note-label {
        font-size: 10px;
        font-family: var(--nd-font-mono);
        color: var(--nd-fg-dim);
        min-height: 14px;
      }
    `,
  ];

  @property({ attribute: false }) sequencer!: StepSequencer;

  @state() private currentStep = -1;
  @state() private bpm = 120;

  private get playing(): boolean {
    return this.sequencer?.isPlaying ?? false;
  }

  private boundStepChange = (e: Event) => {
    this.currentStep = (e as CustomEvent<number>).detail;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.sequencer) {
      this.sequencer.addEventListener('step-change', this.boundStepChange);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.sequencer?.removeEventListener('step-change', this.boundStepChange);
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('sequencer')) {
      const old = changed.get('sequencer') as StepSequencer | undefined;
      old?.removeEventListener('step-change', this.boundStepChange);
      this.sequencer?.addEventListener('step-change', this.boundStepChange);
    }
  }

  override render() {
    if (!this.sequencer) return html``;

    return html`
      <div class="sequencer">
        <div class="transport">
          <button
            class="play-btn ${this.playing ? 'playing' : ''}"
            @click=${this.togglePlay}
          >
            ${this.playing ? 'STOP' : 'PLAY'}
          </button>
          <nd-knob
            label="BPM"
            .min=${60}
            .max=${240}
            .value=${this.bpm}
            .step=${1}
            @input=${this.onBpmChange}
          ></nd-knob>
        </div>
        <div class="steps">
          ${this.sequencer.steps.map((step, i) => html`
            <div class="step ${i === this.currentStep ? 'active' : ''}">
              <div class="step-dot"></div>
              <span class="note-label">${midiNoteName(step.note)}</span>
              <nd-knob
                label="NOTE"
                .min=${36}
                .max=${84}
                .value=${step.note}
                .step=${1}
                @input=${(e: CustomEvent<number>) => this.onNoteChange(i, e.detail)}
              ></nd-knob>
              <nd-knob
                label="VEL"
                .min=${0}
                .max=${127}
                .value=${step.velocity}
                .step=${1}
                @input=${(e: CustomEvent<number>) => this.onVelocityChange(i, e.detail)}
              ></nd-knob>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private togglePlay(): void {
    if (this.playing) {
      this.sequencer.stop();
    } else {
      this.sequencer.start();
    }
    this.requestUpdate();
  }

  private onBpmChange(e: CustomEvent<number>): void {
    this.bpm = e.detail;
    this.sequencer.bpm = e.detail;
  }

  private onNoteChange(index: number, note: number): void {
    this.sequencer.steps[index].note = note;
    this.requestUpdate();
  }

  private onVelocityChange(index: number, velocity: number): void {
    this.sequencer.steps[index].velocity = velocity;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-sequencer': NdSequencer;
  }
}
