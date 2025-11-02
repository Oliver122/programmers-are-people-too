// ===== Programmers-Are-People demo JS (lens edition) =====
(function () {
  const qs = (sel) => document.querySelector(sel);

  // 1) Status bar gentle pulse
  const status = qs('.monaco-workbench .part.statusbar');
  if (status) status.classList.add('pap-status-pulse');
  const OUTPUT_TRIGGER_PREFIX = 'PAP::fastReassure::';
  let lastSeenOutputToken = '';

  function debugLog(...args) {
    try {
      console.log('[PAP demo]', ...args);
    } catch (_) {
      // eslint-disable-line no-empty
    }
  }

  debugLog('custom.js bootstrap');

  function extractTokenFromText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    const match = text.match(/PAP::fastReassure::([a-z0-9]+)/i);
    return match ? match[0] : '';
  }

  function handleToken(token) {
    if (!token || token === lastSeenOutputToken) {
      return;
    }
    lastSeenOutputToken = token;
    debugLog('Triggering reassureFull for token', token);
    reassureFull();
  }

  function scanNodeForToken(node) {
    if (!node) {
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const token = extractTokenFromText(node.textContent);
      if (token) {
        debugLog('Detected cue in text node', token);
        handleToken(token);
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      const possibleAttributes = ['title', 'aria-label', 'data-tooltip'];
      for (const attr of possibleAttributes) {
        const value = el.getAttribute && el.getAttribute(attr);
        const token = extractTokenFromText(value);
        if (token) {
          debugLog('Detected cue in attribute', attr, token);
          handleToken(token);
          return;
        }
      }
      const token = extractTokenFromText(el.textContent);
      if (token) {
        debugLog('Detected cue in element text', token);
        handleToken(token);
      }
    }
  }

  function setupOutputCueListener() {
    debugLog('Setting up output cue listener');
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          scanNodeForToken(mutation.target);
        }
        if (mutation.addedNodes) {
          for (const node of mutation.addedNodes) {
            scanNodeForToken(node);
            if (node.nodeType === Node.ELEMENT_NODE) {
              for (const textNode of node.querySelectorAll('*')) {
                scanNodeForToken(textNode);
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Immediate check on load
    scanNodeForToken(document.body);

    debugLog('Output cue listener ready');
  }

  setupOutputCueListener();

  // 2) Sweep (kept)
  function sweep() {
    const d = document.createElement('div');
    d.className = 'pap-sweep';
    document.body.appendChild(d);
    d.addEventListener('animationend', () => d.remove(), { once: true });
  }

  // 3) Lens / Spotlight
  let lensEl = null;

  function ensureLens() {
    if (!lensEl) {
      lensEl = document.createElement('div');
      lensEl.className = 'pap-lens';
      document.body.appendChild(lensEl);
      // keep it aligned when window resizes
      window.addEventListener('resize', () => {
        if (currentTarget) moveLensTo(currentTarget, currentRadius);
      });
    }
    return lensEl;
  }

  // Move the lens to an element (center it; radius fits the element)
  let currentTarget = null;
  let currentRadius = 160;

  function moveLensTo(el, radiusPx) {
    if (!el) return;
    const lens = ensureLens();
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const radius = radiusPx ?? Math.max(60, Math.min(260, Math.hypot(r.width, r.height) / 3));
    lens.style.setProperty('--cx', `${cx}px`);
    lens.style.setProperty('--cy', `${cy}px`);
    lens.style.setProperty('--r', `${radius}px`);
    currentTarget = el;
    currentRadius = radius;
  }

  function moveLensToViewportCenter(radiusPx = 180) {
    const lens = ensureLens();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    lens.style.setProperty('--cx', `${cx}px`);
    lens.style.setProperty('--cy', `${cy}px`);
    lens.style.setProperty('--r', `${radiusPx}px`);
    currentTarget = null;
    currentRadius = radiusPx;
  }

  function removeLens() {
    if (lensEl) {
      lensEl.remove();
      lensEl = null;
      currentTarget = null;
    }
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

  // 4) Hotkeys
  document.addEventListener('keydown', (e) => {
    // Sweep: Ctrl+Shift+Alt+P
    if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyP') {
      sweep();
    }
    // Lens cycle: Ctrl+Shift+Alt+L
    if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyL') {
      const el = document.activeElement;

      // Cycle: viewport center → status bar → terminal → viewport center
      const state = (ensureLens().dataset.state || 'center');
      if (state === 'center') {
        const sb = statusBarEl();
        if (sb) { moveLensTo(sb, 140); ensureLens().dataset.state = 'status'; }
        else { moveLensToViewportCenter(); ensureLens().dataset.state = 'center'; }
      } else if (state === 'status') {
        const term = terminalEl();
        if (term) { moveLensTo(term, 180); ensureLens().dataset.state = 'terminal'; }
        else { moveLensToViewportCenter(); ensureLens().dataset.state = 'center'; }
      } else {
        moveLensToViewportCenter();
        ensureLens().dataset.state = 'center';
      }
    }
    // Remove lens: Ctrl+Shift+Alt+K
    if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyK') {
      removeLens();
    }
    // Resize lens radius with +/- while lens visible
    if (lensEl && (e.key === '+' || e.key === '=')) {
      const newR = Math.min(360, currentRadius + 16);
      (currentTarget ? moveLensTo(currentTarget, newR) : moveLensToViewportCenter(newR));
    }
    if (lensEl && (e.key === '-' || e.key === '_')) {
      const newR = Math.max(60, currentRadius - 16);
      (currentTarget ? moveLensTo(currentTarget, newR) : moveLensToViewportCenter(newR));
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
    lensCenter: (r) => moveLensToViewportCenter(r),
    lensToStatus: (r) => moveLensTo(statusBarEl(), r),
    lensToTerminal: (r) => moveLensTo(terminalEl(), r),
    lensOff: removeLens,
    reassureFull,
    morphRipple
  });
})();
