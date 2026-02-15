import type { NoteEvent, CCEvent } from '../types.js';

type MidiEventMap = {
  'note-on': CustomEvent<NoteEvent>;
  'note-off': CustomEvent<NoteEvent>;
  'cc': CustomEvent<CCEvent>;
};

export class MidiHandler extends EventTarget {
  private boundInputs = new Set<MIDIInput>();

  attachInput(input: MIDIInput): void {
    if (this.boundInputs.has(input)) return;
    this.boundInputs.add(input);
    input.addEventListener('midimessage', this.onMessage);
  }

  detachInput(input: MIDIInput): void {
    input.removeEventListener('midimessage', this.onMessage);
    this.boundInputs.delete(input);
  }

  attachAll(inputs: ReadonlyArray<MIDIInput>): void {
    const inputSet = new Set(inputs);
    for (const bound of [...this.boundInputs]) {
      if (!inputSet.has(bound)) {
        this.detachInput(bound);
      }
    }
    for (const input of inputs) {
      this.attachInput(input);
    }
  }

  private onMessage = (e: Event): void => {
    const { data } = e as MIDIMessageEvent;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const note = data[1] & 0x7f;         // clamp to 0–127
    const velocity = data.length > 2 ? data[2] & 0x7f : 0;

    switch (status) {
      case 0x90:
        if (velocity > 0) {
          this.emit('note-on', { note, velocity });
        } else {
          this.emit('note-off', { note, velocity: 0 });
        }
        break;
      case 0x80:
        this.emit('note-off', { note, velocity });
        break;
      case 0xb0:
        this.emit('cc', { controller: note, value: velocity });
        break;
    }
  };

  private emit<K extends keyof MidiEventMap>(type: K, detail: MidiEventMap[K]['detail']): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  dispose(): void {
    for (const input of this.boundInputs) {
      input.removeEventListener('midimessage', this.onMessage);
    }
    this.boundInputs.clear();
  }
}
