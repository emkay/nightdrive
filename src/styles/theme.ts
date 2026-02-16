import { css } from 'lit';

export const theme = css`
  :host {
    --nd-bg: #111;
    --nd-bg-surface: #1a1a1a;
    --nd-bg-panel: #222;
    --nd-fg: #eee;
    --nd-fg-dim: #888;
    --nd-accent: #00ccff;
    --nd-accent-glow: rgba(0, 204, 255, 0.3);
    --nd-danger: #ff4444;
    --nd-border: #333;
    --nd-radius: 6px;
    --nd-font: system-ui, -apple-system, sans-serif;
    --nd-font-mono: 'SF Mono', 'Fira Code', monospace;

    font-family: var(--nd-font);
    color: var(--nd-fg);
  }
`;

export const panelStyles = css`
  .panel {
    background: var(--nd-bg-panel);
    border: 1px solid var(--nd-border);
    border-radius: var(--nd-radius);
    padding: 12px;
  }

  .panel-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--nd-fg-dim);
    margin-bottom: 8px;
  }
`;

export const effectPanelStyles = css`
  :host { display: block; }
  .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .on-off {
    background: var(--nd-bg-surface); border: 1px solid var(--nd-border); border-radius: 4px;
    color: var(--nd-fg-dim); padding: 2px 8px; font-size: 10px; font-family: var(--nd-font-mono);
    cursor: pointer; transition: all 0.1s;
  }
  .on-off.on { background: var(--nd-accent); color: var(--nd-bg); border-color: var(--nd-accent); }
  .knobs { display: flex; justify-content: center; }
  .knobs.disabled { opacity: 0.3; pointer-events: none; }
`;

export const toggleButtonStyles = css`
  .toggle-btn {
    background: var(--nd-bg-surface);
    border: 1px solid var(--nd-border);
    border-radius: 4px;
    color: var(--nd-fg-dim);
    padding: 4px 10px;
    font-size: 11px;
    font-family: var(--nd-font-mono);
    cursor: pointer;
    transition: all 0.1s;
  }

  .toggle-btn:hover {
    border-color: var(--nd-accent);
    color: var(--nd-fg);
  }

  .toggle-btn.active {
    background: var(--nd-accent);
    color: var(--nd-bg);
    border-color: var(--nd-accent);
  }
`;
