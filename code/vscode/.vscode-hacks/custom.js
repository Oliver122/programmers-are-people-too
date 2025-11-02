(function () {
  const qs = (sel) => document.querySelector(sel);

  // 1) Status bar gentle pulse
  const status = qs('.monaco-workbench .part.statusbar');
  if (status) status.classList.add('pap-status-pulse');
  // WebSocket bridge (replaces DOM output cue listener)

  function debugLog(...args) {
    try {
      console.log('[PAP demo]', ...args);
    } catch (_) {
      // eslint-disable-line no-empty
    }
  }

  debugLog('custom.js bootstrap');
  // Ensure required CSS is present for effects
  function ensureStyles() {
    if (document.getElementById('pap-style-effects')) return;
    const style = document.createElement('style');
    style.id = 'pap-style-effects';
    style.textContent = `
/* ========= REASSURE: full-screen -> zero ========= */
.pap-reassure { position: fixed; inset: 0; pointer-events: none; z-index: 10000; }
.pap-reassure::before {
  content: "";
  position: fixed;
  left: var(--cx); top: var(--cy);
  --rBase: 120px;
  width: calc(var(--rBase) * 2); height: calc(var(--rBase) * 2);
  transform: translate(-50%, -50%) scale(var(--s0, 1));
  border-radius: 50%;
  box-shadow: 0 0 22px 6px rgba(255,255,255,0.14), 0 0 0 2px rgba(255,255,255,0.26) inset;
  background: radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.0) 60%);
  animation: pap-reassure-to-zero var(--dur, 240ms) linear forwards;
}
.pap-reassure::after {
  content: "";
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.20);
  animation: pap-reassure-dim var(--dur, 240ms) linear forwards;
}
@keyframes pap-reassure-to-zero {
  from { opacity: .95; transform: translate(-50%,-50%) scale(var(--s0, 1)); }
  to   { opacity: 0;   transform: translate(-50%,-50%) scale(0); }
}
@keyframes pap-reassure-dim { from { opacity: .18; } to { opacity: 0; } }

/* ========= GREEN LASER PULSE ========= */
.pap-laser-pulse {
  position: fixed; pointer-events: none; z-index: 10003; border: 2px solid #00ff88;
  box-shadow: 0 0 20px 4px rgba(0, 255, 136, 0.8), 0 0 40px 8px rgba(0, 255, 136, 0.6), inset 0 0 20px 4px rgba(0, 255, 136, 0.4);
  animation: pap-laser-pulse-anim 600ms ease-out forwards;
}
.pap-laser-pulse.full { inset: 0; }
.pap-laser-pulse.element { /* positioned dynamically */ }
@keyframes pap-laser-pulse-anim {
  0% { opacity: 0; box-shadow: 0 0 10px 2px rgba(0,255,136,0.9), 0 0 20px 4px rgba(0,255,136,0.7), inset 0 0 10px 2px rgba(0,255,136,0.5); }
  20% { opacity: 1; box-shadow: 0 0 30px 8px rgba(0,255,136,1), 0 0 60px 16px rgba(0,255,136,0.8), inset 0 0 30px 8px rgba(0,255,136,0.6); }
  100% { opacity: 0; box-shadow: 0 0 50px 20px rgba(0,255,136,0.2), 0 0 100px 40px rgba(0,255,136,0.1), inset 0 0 50px 20px rgba(0,255,136,0.1); }
}

/* ========= SWEEP (subtle left-to-right wipe) ========= */
.pap-sweep {
  position: fixed; inset: 0; pointer-events: none; z-index: 10002;
  background: linear-gradient(90deg,
    rgba(0,0,0,0) 0%,
    rgba(0,255,160,0.10) 50%,
    rgba(0,0,0,0) 100%);
  transform: translateX(-100%);
  animation: pap-sweep 420ms ease-out forwards;
}
@keyframes pap-sweep {
  to { transform: translateX(100%); opacity: 0; }
}

/* ========= SPARKLE (random stars) ========= */
.pap-star {
  position: fixed;
  width: var(--size);
  height: var(--size);
  background: #ffeb3b;
  clip-path: polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
  box-shadow: 0 0 8px #ffeb3b;
  pointer-events: none;
  z-index: 10005;
  animation: pap-sparkle 1.2s ease-out forwards;
}
@keyframes pap-sparkle {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0; }
}
`;
    document.head.appendChild(style);
  }
  ensureStyles();
  const WS_URL = 'ws://127.0.0.1:12718';
  let ws;
  function connect() {
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => { try { debugLog('WS connected'); } catch {} };
      ws.onmessage = (e) => {
        let data; try { data = JSON.parse(e.data); } catch { return; }
        if (!data || !data.type) return;

        if (data.type === 'reassure') {
          const editor = document.querySelector('.monaco-scrollable-element') || document.body;
          try { window.PAP?.reassureFull?.(editor, 480); } catch {}
          return;
        }

        if (data.type === 'ripple') {
          try { window.PAP?.morphRipple?.(); } catch {}
          return;
        }

        if (data.type === 'laser') {
          const scope = data.scope || 'full';
          try {
            if (scope === 'full') {
              window.PAP?.laserPulseFull?.();
            } else if (scope === 'editor') {
              const el = document.querySelector('.monaco-scrollable-element') || document.body;
              window.PAP?.laserPulseElement?.(el);
            } else if (scope === 'terminal') {
              const el = (typeof terminalEl === 'function' && terminalEl()) || document.body;
              window.PAP?.laserPulseElement?.(el);
            } else if (scope === 'sidebar') {
              window.PAP?.laserPulseSidebar?.();
            } else if (scope === 'rightBar') {
              window.PAP?.laserPulseRightBar?.();
            } else if (scope === 'panelRight') {
              window.PAP?.laserPulsePanelRight?.();
            } else {
              // Fallback
              window.PAP?.laserPulseFull?.();
            }
          } catch {}
          return;
        }

        if (data.type === 'sweep') {
          try { window.PAP?.sweep?.(); } catch {}
          return;
        }

        if (data.type === 'sparkle') {
          try {
            const mode = data.mode || 'burst';
            if (mode === 'rain') {
              window.PAP?.sparkleRain?.(data.durationMs || 5000, data.intervalMs || 500, data.count || 30);
            } else {
              window.PAP?.sparkleBurst?.(data.count || 30, data.ttlMs || 1200);
            }
          } catch {}
          return;
        }
      };
      ws.onclose = () => setTimeout(connect, 1000);
      ws.onerror = () => { try { ws.close(); } catch {} };
    } catch {
      setTimeout(connect, 1500);
    }
  }
  connect();

  function sweep() {
    const d = document.createElement('div');
    d.className = 'pap-sweep';
    document.body.appendChild(d);
    d.addEventListener('animationend', () => d.remove(), { once: true });
  }

  // Sparkle helpers
  function sparkleBurst(count = 30, ttlMs = 1200) {
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'pap-star';
      const sizePx = Math.floor(Math.random() * 20) + 12; // 12px..32px
      star.style.setProperty('--size', `${sizePx}px`);
      star.style.left = Math.random() * window.innerWidth + 'px';
      star.style.top = Math.random() * window.innerHeight + 'px';
      document.body.appendChild(star);
      setTimeout(() => star.remove(), ttlMs);
    }
  }

  function sparkleRain(durationMs = 5000, intervalMs = 500, count = 30) {
    const id = setInterval(() => sparkleBurst(count), intervalMs);
    setTimeout(() => clearInterval(id), durationMs);
    return id;
  }

  // Convenience selectors
  function statusBarEl() { return qs('.monaco-workbench .part.statusbar'); }
  function terminalEl() {
    // Try common terminal roots
    return qs('.terminal-outer-container') ||
           qs('.panel .terminal') ||
           qs('.part.panel .pane-body') ||
           qs('.part.panel');
  }
  function sideBarEl() {
    return qs('.monaco-workbench .part.sidebar') || qs('.part.sidebar');
  }
  function auxBarEl() {
    // VS Code right-hand bar (aka Secondary Side Bar / Auxiliary Bar)
    return qs('.monaco-workbench .part.auxiliarybar') || qs('.part.auxiliarybar');
  }

  function panelRightOfTerminalEl() {
    const panel = qs('.part.panel');
    if (!panel) return null;
    const term = terminalEl();
    if (!term) return null;
    const tRect = term.getBoundingClientRect();
    // Find visible split children inside panel
    const splits = Array.from(panel.querySelectorAll('.split-view-view'))
      .filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0);
    if (!splits.length) return null;
    // Pick the split whose left edge is to the right of terminal center
    const candidates = splits
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter((o) => o.rect.left > tRect.left + tRect.width / 2 - 1);
    if (candidates.length) {
      // Choose the rightmost candidate
      candidates.sort((a, b) => a.rect.left - b.rect.left);
      return candidates[candidates.length - 1].el;
    }
    // Fallback: choose the widest non-terminal split
    const nonTerminal = splits
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter((o) => Math.abs(o.rect.left - tRect.left) > 2 || Math.abs(o.rect.width - tRect.width) > 2)
      .sort((a, b) => b.rect.width - a.rect.width);
    return nonTerminal[0]?.el || null;
  }

  document.addEventListener('keydown', (e) => {
    // Sweep: Ctrl+Shift+Alt+P
    if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyP') {
      sweep();
    }
  });

  // Expose for DevTools poking
  // ---- New: Fast Reassure + Morph Ripple ----
  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  }

  function computeFullCoverScale(cx, cy, rBase = 120) {
    const d1 = Math.hypot(cx, cy);
    const d2 = Math.hypot(window.innerWidth - cx, cy);
    const d3 = Math.hypot(cx, window.innerHeight - cy);
    const d4 = Math.hypot(window.innerWidth - cx, window.innerHeight - cy);
    const maxD = Math.max(d1, d2, d3, d4);
    return maxD / rBase;
  }

  // Reassure: full-viewport shrink to zero from target center
  function reassureFull(targetEl, ms = 240) {
    const el = targetEl || qs('.monaco-editor, .split-view-view .editor-container, .monaco-workbench') || document.body;
    // Fallback to viewport center if no element rect
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    if (el.getBoundingClientRect) {
      const c = centerOf(el);
      x = c.x; y = c.y;
    }
    const d = document.createElement('div');
    d.className = 'pap-reassure';
    d.style.setProperty('--cx', `${x}px`);
    d.style.setProperty('--cy', `${y}px`);
    d.style.setProperty('--dur', `${ms}ms`);
    const s0 = computeFullCoverScale(x, y, 120);
    d.style.setProperty('--s0', s0);
    document.body.appendChild(d);
    const done = () => d.remove();
    d.addEventListener('animationend', done, { once: true });
    setTimeout(done, ms + 200);
  }

  // Morph ripple via SVG filter with on-demand SMIL
  let morphDefs = null;
  function ensureMorphDefs() {
    if (morphDefs) return morphDefs;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'papMorphRipple');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const turb = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    turb.setAttribute('id', 'papMorphTurbulence');
    turb.setAttribute('type', 'fractalNoise');
    turb.setAttribute('baseFrequency', '0.02');
    turb.setAttribute('numOctaves', '3');
    turb.setAttribute('result', 'noise');
    turb.setAttribute('seed', '2');
    const animBF = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    animBF.setAttribute('attributeName', 'baseFrequency');
    animBF.setAttribute('values', '0.02;0.008;0.001');
    animBF.setAttribute('dur', '800ms');
    animBF.setAttribute('repeatCount', '1');
    animBF.setAttribute('begin', 'indefinite');
    turb.appendChild(animBF);

    const disp = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('in2', 'noise');
    disp.setAttribute('scale', '0');
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'G');
    const animScale = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    animScale.setAttribute('attributeName', 'scale');
    animScale.setAttribute('values', '0;80;20;0');
    animScale.setAttribute('dur', '800ms');
    animScale.setAttribute('repeatCount', '1');
    animScale.setAttribute('begin', 'indefinite');
    disp.appendChild(animScale);

    filter.appendChild(turb);
    filter.appendChild(disp);
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.body.appendChild(svg);
    morphDefs = { svg, filter, anims: [animBF, animScale] };
    return morphDefs;
  }

  function morphRipple(durationMs = 800) {
    const workbench = qs('.monaco-workbench') || document.body;
    const originalFilter = workbench.style.filter;
    const defs = ensureMorphDefs();
    // Apply filter
    workbench.style.filter = 'url(#papMorphRipple)';
    // Restart animations
    defs.anims.forEach(a => a.beginElement && a.beginElement());
    // Clear after done
    setTimeout(() => { workbench.style.filter = originalFilter || ''; }, durationMs + 20);
  }

  // ---- Green Laser Pulse (full + element variants) ----
  function laserPulseFull() {
    const d = document.createElement('div');
    d.className = 'pap-laser-pulse full';
    document.body.appendChild(d);
    const done = () => d.remove();
    d.addEventListener('animationend', done, { once: true });
    setTimeout(done, 700);
  }

  function laserPulseElement(el) {
    const target = el || terminalEl() || statusBarEl() || document.body;
    const rect = target.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'pap-laser-pulse element';
    d.style.left = `${rect.left}px`;
    d.style.top = `${rect.top}px`;
    d.style.width = `${rect.width}px`;
    d.style.height = `${rect.height}px`;
    document.body.appendChild(d);
    const done = () => d.remove();
    d.addEventListener('animationend', done, { once: true });
    setTimeout(done, 700);
  }

  function laserPulseSidebar() {
    const s = sideBarEl();
    if (s) {
      laserPulseElement(s);
    } else {
      laserPulseFull();
    }
  }

  function laserPulseRightBar() {
    const r = auxBarEl();
    if (r) {
      laserPulseElement(r);
    } else {
      laserPulseFull();
    }
  }

  function laserPulsePanelRight() {
    const p = panelRightOfTerminalEl();
    if (p) {
      laserPulseElement(p);
    } else {
      // Fall back to panel itself
      const panel = qs('.part.panel');
      if (panel) {
        laserPulseElement(panel);
      } else {
        laserPulseFull();
      }
    }
  }

  // ---- Hotkeys for new effects ----
  document.addEventListener('keydown', (e) => {
    // Fast Reassure: Ctrl+Alt+E
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyE') {
      reassureFull();
    }
    // Morph Ripple: Ctrl+Alt+Q
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyQ') {
      morphRipple();
    }
    // Laser Pulse (Full Screen): Ctrl+Alt+G
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyG') {
      laserPulseFull();
    }
    // Laser Pulse (Terminal Element): Ctrl+Alt+T
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyT') {
      const t = terminalEl();
      if (t) laserPulseElement(t);
    }
    // Laser Pulse (Sidebar/Task area): Ctrl+Alt+S
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyS') {
      laserPulseSidebar();
    }
    // Laser Pulse (Right of Terminal in Panel): Ctrl+Alt+R
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyR') {
      laserPulsePanelRight();
    }
    // Laser Pulse (Auxiliary Bar / secondary sidebar): Ctrl+Alt+A
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyA') {
      laserPulseRightBar();
    }
    // Sparkle Burst (random stars): Ctrl+Alt+B
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyB') {
      sparkleBurst();
    }
    // Sparkle Rain (repeating bursts): Ctrl+Alt+Y
    if (e.ctrlKey && e.altKey && !e.shiftKey && e.code === 'KeyY') {
      sparkleRain();
    }
  });

  window.PAP = Object.assign(window.PAP || {}, {
    sweep,
    reassureFull,
    morphRipple,
    laserPulseFull,
    laserPulseElement,
    laserPulseSidebar,
    laserPulseRightBar,
    laserPulsePanelRight,
    sparkleBurst,
    sparkleRain
  });
})();
