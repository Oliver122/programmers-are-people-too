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
  const WS_URL = 'ws://127.0.0.1:12718';
  let ws;
  function connect() {
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => { try { debugLog('WS connected'); } catch {} };
      ws.onmessage = (e) => {
        let data; try { data = JSON.parse(e.data); } catch { return; }
        if (data && data.type === 'reassure') {
          const editor = document.querySelector('.monaco-scrollable-element') || document.body;
          try { window.PAP?.reassureFull?.(editor, 480); } catch {}
        } else if (data && data.type === 'ripple') {
          try { window.PAP?.morphRipple?.(); } catch {}
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

  // Convenience selectors
  function statusBarEl() { return qs('.monaco-workbench .part.statusbar'); }
  function terminalEl() {
    // Try common terminal roots
    return qs('.terminal-outer-container') ||
           qs('.panel .terminal') ||
           qs('.part.panel .pane-body') ||
           qs('.part.panel');
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
  });

  window.PAP = Object.assign(window.PAP || {}, {
    sweep,
    reassureFull,
    morphRipple
  });
})();
