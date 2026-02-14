# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — typecheck (`tsc --noEmit`) then build with Vite
- `npm run preview` — preview production build

No test runner or linter is configured.

## Architecture

Nightdrive is a browser-based polyphonic synthesizer. UI is built with **Lit** web components (using legacy/experimental decorators), audio runs on the **Web Audio API**, and input comes from an on-screen keyboard or **Web MIDI**.

### Signal flow

```
MIDI input / on-screen keyboard
        ↓ (note-on/note-off events)
    nd-app (orchestrator)
        ↓
  VoiceAllocator (8-voice polyphony, oldest-note stealing)
        ↓
     Voice (OscillatorNode → BiquadFilterNode → GainNode w/ ADSR envelope)
        ↓
   AudioEngine (masterGain → analyser → destination)
```

### Key layers

- **`src/audio/`** — `AudioEngine` owns the AudioContext and master output chain. `VoiceAllocator` manages a pool of `Voice` instances. Each `Voice` is a self-contained Osc→Filter→Gain chain with ADSR envelope logic.
- **`src/midi/`** — `MidiAccess` wraps the Web MIDI API for device enumeration. `MidiHandler` parses raw MIDI messages and emits typed `note-on`/`note-off`/`cc` CustomEvents.
- **`src/components/`** — Lit web components prefixed `nd-`. `nd-app` is the root that wires audio, MIDI, and UI together. Parameter panels (`nd-oscillator`, `nd-filter`, `nd-envelope`) emit change events that `nd-app` forwards to the `VoiceAllocator`. `nd-knob` is a reusable SVG rotary control (vertical drag). `nd-keyboard` is the on-screen piano.
- **`src/types.ts`** — shared types (`VoiceParams`, `ADSRParams`, `NoteEvent`, etc.) and `DEFAULT_VOICE_PARAMS`.
- **`src/styles/theme.ts`** — CSS custom properties (all `--nd-*` prefixed) and shared `panelStyles`.

### Conventions

- Vite root is `src/` (not project root). The HTML entry point is `src/index.html`.
- Components communicate upward via bubbling CustomEvents (`composed: true`), downward via properties/methods.
- TypeScript uses `experimentalDecorators` (not TC39 decorators) and `useDefineForClassFields: false` — required by Lit's decorator style.
- Imports use `.js` extensions (TypeScript + bundler module resolution convention).
