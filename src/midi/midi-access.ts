/**
 * Requests Web MIDI API access, enumerates inputs,
 * and dispatches events on device connect/disconnect.
 */
export class MidiAccess extends EventTarget {
  private access: MIDIAccess | null = null;
  private _inputs: MIDIInput[] = [];

  get inputs(): ReadonlyArray<MIDIInput> {
    return this._inputs;
  }

  get supported(): boolean {
    return 'requestMIDIAccess' in navigator;
  }

  async request(): Promise<boolean> {
    if (!this.supported) return false;

    try {
      this.access = await navigator.requestMIDIAccess();
      this.access.addEventListener('statechange', () => this.refreshInputs());
      this.refreshInputs();
      return true;
    } catch {
      console.warn('MIDI access denied or unavailable');
      return false;
    }
  }

  private refreshInputs(): void {
    if (!this.access) return;
    this._inputs = Array.from(this.access.inputs.values());
    this.dispatchEvent(new CustomEvent('inputs-changed', { detail: this._inputs }));
  }
}
