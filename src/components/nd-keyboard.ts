import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';

interface KeyDef {
  note: number;
  isBlack: boolean;
  position: number;
}

@customElement('nd-keyboard')
export class NdKeyboard extends LitElement {
  static override styles = [
    theme,
    css`
      :host {
        display: block;
      }

      .keyboard {
        position: relative;
        height: 120px;
        display: flex;
        user-select: none;
        touch-action: none;
      }

      .white-key {
        flex: 1;
        background: linear-gradient(to bottom, #e8e8e8, #fff);
        border: 1px solid #999;
        border-radius: 0 0 4px 4px;
        cursor: pointer;
        position: relative;
        z-index: 1;
        transition: background 0.05s;
      }

      .white-key.active {
        background: linear-gradient(to bottom, #ccc, #ddd);
      }

      .black-key {
        position: absolute;
        top: 0;
        width: 5%;
        height: 70%;
        background: linear-gradient(to bottom, #333, #111);
        border: 1px solid #000;
        border-radius: 0 0 3px 3px;
        cursor: pointer;
        z-index: 2;
        transition: background 0.05s;
      }

      .black-key.active {
        background: linear-gradient(to bottom, #555, #333);
      }
    `,
  ];

  @property({ type: Number }) startNote = 48;
  @property({ type: Number }) octaves = 2;

  private activeNotes = new Set<number>();
  private pointerNoteMap = new Map<number, number>();

  override render() {
    const keys = this.buildKeys();
    const whiteKeys = keys.filter(k => !k.isBlack);
    const blackKeys = keys.filter(k => k.isBlack);
    const totalWhites = whiteKeys.length;

    return html`
      <div class="keyboard"
        @pointerdown=${this.onPointerDown}
        @pointerup=${this.onPointerUp}
        @pointerleave=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}>
        ${whiteKeys.map(k => html`
          <div class="white-key ${this.activeNotes.has(k.note) ? 'active' : ''}"
            data-note=${k.note}></div>
        `)}
        ${blackKeys.map(k => {
          const leftPercent = (k.position / totalWhites) * 100;
          return html`
            <div class="black-key ${this.activeNotes.has(k.note) ? 'active' : ''}"
              data-note=${k.note}
              style="left: ${leftPercent}%; transform: translateX(-50%)"></div>
          `;
        })}
      </div>
    `;
  }

  private buildKeys(): KeyDef[] {
    const keys: KeyDef[] = [];
    const blackOffsets = [0.6, 1.6, 3.6, 4.6, 5.6];
    const isBlackInOctave = [false, true, false, true, false, false, true, false, true, false, true, false];

    let whiteIndex = 0;

    for (let oct = 0; oct < this.octaves; oct++) {
      const octaveStart = this.startNote + oct * 12;
      let localWhite = 0;

      for (let i = 0; i < 12; i++) {
        const note = octaveStart + i;
        const isBlack = isBlackInOctave[i];

        if (isBlack) {
          const blackIdx = [1, 3, 6, 8, 10].indexOf(i);
          const pos = whiteIndex - localWhite + blackOffsets[blackIdx];
          keys.push({ note, isBlack: true, position: pos });
        } else {
          keys.push({ note, isBlack: false, position: whiteIndex });
          whiteIndex++;
          localWhite++;
        }
      }
    }

    return keys;
  }

  private onPointerDown = (e: PointerEvent): void => {
    const target = e.target as HTMLElement;
    const noteStr = target.dataset.note;
    if (!noteStr) return;

    e.preventDefault();
    target.setPointerCapture(e.pointerId);

    const note = parseInt(noteStr, 10);
    this.pointerNoteMap.set(e.pointerId, note);
    this.activeNotes.add(note);
    this.requestUpdate();
    this.emitNote('note-on', note, 100);
  };

  private onPointerUp = (e: PointerEvent): void => {
    const note = this.pointerNoteMap.get(e.pointerId);
    if (note === undefined) return;

    this.pointerNoteMap.delete(e.pointerId);
    this.activeNotes.delete(note);
    this.requestUpdate();
    this.emitNote('note-off', note, 0);
  };

  setNoteActive(note: number, active: boolean): void {
    if (active) {
      this.activeNotes.add(note);
    } else {
      this.activeNotes.delete(note);
    }
    this.requestUpdate();
  }

  private emitNote(type: 'note-on' | 'note-off', note: number, velocity: number): void {
    this.dispatchEvent(
      new CustomEvent(type, {
        detail: { note, velocity },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nd-keyboard': NdKeyboard;
  }
}
